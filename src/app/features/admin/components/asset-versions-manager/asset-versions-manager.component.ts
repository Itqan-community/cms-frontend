import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subject, debounceTime, distinctUntilChanged, finalize, forkJoin, takeUntil } from 'rxjs';
import {
  PORTAL_PERMISSIONS,
  type PortalPermissionCode,
} from '../../constants/portal-permission.constants';
import type { AssetLanguage, ContentChange } from '../../models/asset-content.models';
import type { AssetVersion, AssetVersionParentKind } from '../../models/asset-versions.models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetContentService } from '../../services/asset-content.service';
import { AssetVersionsService } from '../../services/asset-versions.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import { localizedLanguageName } from '../../utils/iso-639.util';
import { AdminTablePaginationComponent } from '../admin-table-pagination/admin-table-pagination.component';
import { AdminTitleCountComponent } from '../admin-title-count/admin-title-count.component';
import { ContentChangesComponent } from '../content-changes/content-changes.component';
import { CsvTemplateDownloadComponent } from '../csv-template-download/csv-template-download.component';
import { UniversalAssetPreviewerComponent } from '../universal-asset-previewer/universal-asset-previewer.component';

const DEFAULT_PAGE_SIZE = 10;
/** Diff rows per request — the API's maximum, so large diffs need few round trips. */
const DIFF_PAGE_SIZE = 1000;

/** Upload/replace rejections that have a more helpful message than the generic save error. */
const SAVE_ERROR_KEYS: Record<string, string> = {
  content_file_unparseable: 'ADMIN.VERSION_PUBLISHING.FILE_UNPARSEABLE_ERROR',
  version_is_published: 'ADMIN.VERSION_PUBLISHING.VERSION_IS_PUBLISHED_ERROR',
};

/**
 * Version management is gated per asset type: the backend `PermissionChoice` set has no
 * catalogue-wide code, so each kind maps to its own update/delete permission.
 */
const VERSION_PERMISSIONS: Record<
  AssetVersionParentKind,
  { mutate: PortalPermissionCode; delete: PortalPermissionCode }
> = {
  tafsir: {
    mutate: PORTAL_PERMISSIONS.PORTAL_UPDATE_TAFSIR,
    delete: PORTAL_PERMISSIONS.PORTAL_DELETE_TAFSIR,
  },
  translation: {
    mutate: PORTAL_PERMISSIONS.PORTAL_UPDATE_TRANSLATION,
    delete: PORTAL_PERMISSIONS.PORTAL_DELETE_TRANSLATION,
  },
  mushaf: {
    mutate: PORTAL_PERMISSIONS.PORTAL_UPDATE_MUSHAF,
    delete: PORTAL_PERMISSIONS.PORTAL_DELETE_MUSHAF,
  },
  font: {
    mutate: PORTAL_PERMISSIONS.PORTAL_UPDATE_FONT,
    delete: PORTAL_PERMISSIONS.PORTAL_DELETE_FONT,
  },
  program: {
    mutate: PORTAL_PERMISSIONS.PORTAL_UPDATE_PROGRAM,
    delete: PORTAL_PERMISSIONS.PORTAL_DELETE_PROGRAM,
  },
};

@Component({
  selector: 'app-asset-versions-manager',
  standalone: true,
  imports: [
    DatePipe,
    CsvTemplateDownloadComponent,
    ReactiveFormsModule,
    TranslateModule,
    NgIcon,
    FormsModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    AdminTitleCountComponent,
    AdminTablePaginationComponent,
    NzSpinModule,
    NzTableModule,
    NzToolTipModule,
    UniversalAssetPreviewerComponent,
    ContentChangesComponent,
  ],
  templateUrl: './asset-versions-manager.component.html',
  styleUrl: './asset-versions-manager.component.less',
})
export class AssetVersionsManagerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly assetVersionsService = inject(AssetVersionsService);
  private readonly assetContentService = inject(AssetContentService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly lastLanguage = inject(LastActiveLanguageService);
  private readonly search$ = new Subject<string>();
  /** Emits to abort the in-flight create/update HTTP request (unsubscribe → browser abort). */
  private readonly cancelInFlightSubmit$ = new Subject<void>();
  /** Emits to abort the in-flight versions request, so a slower earlier response
   *  can never overwrite the list of the language/page now selected. */
  private readonly cancelInFlightList$ = new Subject<void>();
  /** Emits to abort preview requests. */
  private readonly cancelPreview$ = new Subject<void>();

  /** Parent asset kind — drives API paths. */
  @Input({ required: true }) kind!: AssetVersionParentKind;
  /** Slug from route (tafsir or translation). */
  @Input({ required: true }) slug!: string;
  /** i18n prefix for panel strings, e.g. ADMIN.TAFSIRS.DETAIL.VERSIONS */
  @Input({ required: true }) i18nPrefix!: string;
  /** i18n key for section heading (existing VERSIONS_TITLE). */
  @Input({ required: true }) sectionTitleKey!: string;
  /** Parent asset id (required by portal multipart body). */
  @Input({ required: true }) assetId!: number;
  /** Asset English name — used to name exported files (falls back to the slug). */
  @Input() assetNameEn?: string;

  readonly list = signal<AssetVersion[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);

  /** Expanded commit's diff panel state. */
  readonly expandedId = signal<number | null>(null);
  readonly diffLoading = signal(false);
  /** Set when the diff request failed, so the panel says so instead of
   *  reporting the empty diff as "no changes". */
  readonly diffError = signal(false);
  /** The first page is shown; the rest of a large diff is still arriving. */
  readonly diffLoadingMore = signal(false);
  readonly diff = signal<ContentChange[]>([]);

  /** Preview modal state. */
  readonly previewModalVisible = signal(false);
  readonly previewDiffLoading = signal(false);
  readonly previewOriginalText = signal<string | null>(null);
  readonly previewModifiedText = signal<string | null>(null);
  readonly previewVersion = signal<AssetVersion | null>(null);
  readonly previewPreviousVersion = signal<AssetVersion | null>(null);

  /** Multi-language assets (translations/tafsirs) let the versions be filtered by language. */
  readonly languages = signal<AssetLanguage[]>([]);
  readonly selectedLanguage = signal<string | null>(null);
  /** Localized language name for the current UI language (e.g. fr → "الفرنسية"). */
  readonly langName = (code: string): string =>
    localizedLanguageName(code, this.translate.currentLang || 'en');

  /** The currently selected language rendition (source or translation). */
  readonly selectedLanguageObj = computed(() =>
    this.languages().find((l) => l.language === this.selectedLanguage())
  );
  /** The source language's availability follows the asset's own status, so only
   *  translations expose a manual availability toggle here. */
  readonly canToggleAvailability = computed(
    () => this.canMutateVersions() && this.selectedLanguageObj()?.is_source === false
  );
  readonly selectedLangAvailable = computed(
    () => this.selectedLanguageObj()?.is_available ?? false
  );
  readonly togglingAvailability = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly downloadingId = signal<number | null>(null);
  readonly restoringId = signal<number | null>(null);
  readonly publishingId = signal<number | null>(null);
  readonly searchTerm = signal('');
  readonly selectedFileName = signal<string | null>(null);
  private selectedFile: File | null = null;

  /** Create/edit popup visibility. */
  readonly versionModalOpen = signal(false);
  /** Full i18n key for modal title (set when opening). */
  readonly versionModalTitleKey = signal('');
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingId = signal<number | null>(null);
  /** Language chosen for a newly uploaded version (translations/tafsirs). */
  readonly versionLanguage = signal<string | null>(null);
  /** A language-aware upload needs a language; the list may still be loading or have failed. */
  readonly missingVersionLanguage = computed(
    () => this.modalMode() === 'create' && this.supportsLanguages() && !this.versionLanguage()
  );

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    summary: ['', [Validators.required]],
  });

  /** Only translations and tafsirs carry per-language content/versions. */
  supportsLanguages(): boolean {
    return this.kind === 'translation' || this.kind === 'tafsir';
  }

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.page.set(1);
        this.loadList();
      });
    if (this.supportsLanguages()) {
      this.loadLanguages();
    } else {
      this.loadList();
    }
  }

  /** Load the asset's languages, restoring the last-active one (else the source),
   *  then load its versions. */
  private loadLanguages(): void {
    this.assetContentService
      .listLanguages(this.kind, this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (langs) => {
          this.languages.set(langs);
          if (langs.length === 0) {
            this.selectedLanguage.set(null);
            this.versionLanguage.set(null);
            this.loadList();
            return;
          }
          const stored = this.lastLanguage.get(this.kind, this.slug);
          const remembered = stored && langs.some((l) => l.language === stored) ? stored : null;
          // The source language, not whatever the API happened to list first: a response that
          // returns a translation ahead of the source would otherwise pick that translation as
          // both the version filter and the upload default.
          const fallback = langs.find((l) => l.is_source) ?? langs[0];
          const defaultLang = remembered ?? fallback.language;
          this.selectedLanguage.set(defaultLang);
          this.versionLanguage.set(defaultLang);
          this.loadList();
        },
        error: () => {
          this.languages.set([]);
          this.selectedLanguage.set(null);
          this.versionLanguage.set(null);
          this.loadList();
        },
      });
  }

  onLanguageChange(lang: string): void {
    if (this.selectedLanguage() === lang) return;
    this.selectedLanguage.set(lang);
    this.versionLanguage.set(lang);
    this.lastLanguage.set(this.kind, this.slug, lang);
    this.page.set(1);
    this.loadList();
  }

  onSearchInput(value: string): void {
    this.search$.next(value);
  }

  loadList(): void {
    if (!this.slug) return;
    this.cancelInFlightList$.next();
    this.loading.set(true);
    this.assetVersionsService
      .list(this.kind, this.slug, {
        page: this.page(),
        page_size: this.pageSize(),
        search: this.searchTerm() || undefined,
        language: this.supportsLanguages() ? this.selectedLanguage() || undefined : undefined,
      })
      .pipe(takeUntil(this.cancelInFlightList$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.list.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.message.error(this.translate.instant(`${this.i18nPrefix}.MESSAGES.LOAD_ERROR`));
        },
      });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.loadList();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.loadList();
  }

  /** Uploading, replacing a file and restoring change the text. Translations and
   *  tafsirs have their own content permission; other kinds use their update one. */
  canEditContent(): boolean {
    switch (this.kind) {
      case 'tafsir':
        return this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_EDIT_TAFSIR_CONTENT);
      case 'translation':
        return this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_EDIT_TRANSLATION_CONTENT);
      default:
        return this.canMutateVersions();
    }
  }

  openCreateModal(): void {
    if (!this.canEditContent()) {
      return;
    }
    this.modalMode.set('create');
    this.editingId.set(null);
    this.form.reset({ name: '', summary: '' });
    this.clearFile();
    // Default the upload to the language currently being viewed, else the source.
    const source = this.languages().find((l) => l.is_source) ?? this.languages()[0];
    this.versionLanguage.set(this.selectedLanguage() ?? source?.language ?? null);
    this.versionModalTitleKey.set(`${this.i18nPrefix}.MODAL_TITLE_CREATE`);
    this.versionModalOpen.set(true);
  }

  openEditModal(row: AssetVersion): void {
    if (!this.canMutateVersions()) {
      return;
    }
    this.modalMode.set('edit');
    this.editingId.set(row.id);
    this.form.patchValue({
      name: row.name,
      summary: row.summary ?? '',
    });
    this.clearFile();
    this.versionModalTitleKey.set(`${this.i18nPrefix}.MODAL_TITLE_EDIT`);
    this.versionModalOpen.set(true);
  }

  onVersionModalVisibleChange(visible: boolean): void {
    this.versionModalOpen.set(visible);
    if (!visible) {
      this.abortInFlightSave();
      this.resetModalFormState();
    }
  }

  closeVersionModal(): void {
    this.abortInFlightSave();
    this.versionModalOpen.set(false);
    this.resetModalFormState();
  }

  /** Unsubscribes active save request so Angular HttpClient aborts the network call. */
  private abortInFlightSave(): void {
    this.cancelInFlightSubmit$.next();
  }

  private resetModalFormState(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', summary: '' });
    this.clearFile();
  }

  onPickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    this.selectedFile = file;
    this.selectedFileName.set(file.name);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName.set(null);
  }

  submit(): void {
    const creating = this.editingId() == null;
    if (creating ? !this.canEditContent() : !this.canMutateVersions()) {
      return;
    }
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    const id = this.editingId();
    if (id == null && !this.selectedFile) {
      this.message.warning(this.translate.instant(`${this.i18nPrefix}.MESSAGES.FILE_REQUIRED`));
      return;
    }
    if (id == null && this.supportsLanguages() && !this.versionLanguage()) {
      this.message.warning(this.translate.instant(`${this.i18nPrefix}.MESSAGES.LANGUAGE_REQUIRED`));
      return;
    }

    const payload = {
      asset_id: this.assetId,
      name: this.form.getRawValue().name,
      summary: this.form.getRawValue().summary,
      file: this.selectedFile ?? undefined,
      // Language only applies when creating a new (uploaded) version.
      language:
        id == null && this.supportsLanguages() ? (this.versionLanguage() ?? undefined) : undefined,
    };

    // Abort any previous in-flight save (e.g. double submit).
    this.abortInFlightSave();
    this.saving.set(true);

    const req$ =
      id == null
        ? this.assetVersionsService.create(this.kind, this.slug, payload)
        : this.assetVersionsService.update(this.kind, this.slug, id, payload);

    req$
      .pipe(
        takeUntil(this.cancelInFlightSubmit$),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          const msgKey =
            id == null
              ? `${this.i18nPrefix}.MESSAGES.CREATE_SUCCESS`
              : `${this.i18nPrefix}.MESSAGES.UPDATE_SUCCESS`;
          this.message.success(this.translate.instant(msgKey));
          this.closeVersionModalWithoutCancelEmit();
          if (id == null && this.supportsLanguages() && this.versionLanguage()) {
            const targetLang = this.versionLanguage()!;
            if (targetLang !== this.selectedLanguage()) {
              this.selectedLanguage.set(targetLang);
              this.lastLanguage.set(this.kind, this.slug, targetLang);
              this.page.set(1);
            }
          }
          this.loadList();
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 0) return;
          const errorName = err instanceof HttpErrorResponse ? err.error?.error_name : undefined;
          const key =
            SAVE_ERROR_KEYS[errorName as string] ?? `${this.i18nPrefix}.MESSAGES.SAVE_ERROR`;
          this.message.error(this.translate.instant(key));
        },
      });
  }

  /** Close modal after success without re-emitting cancel (save already finished). */
  private closeVersionModalWithoutCancelEmit(): void {
    this.versionModalOpen.set(false);
    this.resetModalFormState();
  }

  deleteRow(row: AssetVersion): void {
    if (!this.canDeleteVersions()) {
      return;
    }
    const dir = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.modal.confirm({
      nzTitle: this.translate.instant(`${this.i18nPrefix}.DELETE_CONFIRM_TITLE`),
      nzContent: this.translate.instant(`${this.i18nPrefix}.DELETE_CONFIRM_BODY`, {
        name: row.name,
      }),
      nzOkText: this.translate.instant(`${this.i18nPrefix}.DELETE_OK`),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: dir,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.assetVersionsService.delete(this.kind, this.slug, row.id).subscribe({
            next: () => {
              this.message.success(
                this.translate.instant(`${this.i18nPrefix}.MESSAGES.DELETE_SUCCESS`)
              );
              if (this.versionModalOpen() && this.editingId() === row.id) {
                this.closeVersionModal();
              }
              this.loadList();
              resolve();
            },
            error: () => {
              this.message.error(
                this.translate.instant(`${this.i18nPrefix}.MESSAGES.DELETE_ERROR`)
              );
              reject();
            },
          });
        }),
    });
  }

  /** Preview modal handlers. */
  openPreview(row: AssetVersion): void {
    this.cancelPreview$.next();
    this.previewVersion.set(row);
    this.previewPreviousVersion.set(null);
    this.previewOriginalText.set(null);
    this.previewModifiedText.set(null);
    this.previewModalVisible.set(true);

    this.assetVersionsService
      .listAll(this.kind, this.slug)
      .pipe(takeUntil(this.cancelPreview$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const versions = response.results;
          const previousVersion = this.findPreviousVersion(row, versions);
          this.previewPreviousVersion.set(previousVersion);

          if (
            !previousVersion ||
            !row.file_url ||
            !this.isTextPreviewable(row.file_url) ||
            !previousVersion.file_url ||
            !this.isTextPreviewable(previousVersion.file_url)
          ) {
            this.previewDiffLoading.set(false);
            return;
          }

          this.loadTextDiff(row, previousVersion);
        },
        error: () => {
          this.previewDiffLoading.set(false);
        },
      });
  }

  closePreview(): void {
    this.cancelPreview$.next();
    this.previewModalVisible.set(false);
    this.previewDiffLoading.set(false);
    this.previewOriginalText.set(null);
    this.previewModifiedText.set(null);
    this.previewVersion.set(null);
    this.previewPreviousVersion.set(null);
  }

  private findPreviousVersion(
    current: AssetVersion,
    versions: AssetVersion[]
  ): AssetVersion | null {
    const orderedVersions = [...versions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const currentIndex = orderedVersions.findIndex((version) => version.id === current.id);
    if (currentIndex === -1 || currentIndex >= orderedVersions.length - 1) {
      return null;
    }
    return orderedVersions[currentIndex + 1] ?? null;
  }

  private loadTextDiff(current: AssetVersion, previous: AssetVersion): void {
    this.previewDiffLoading.set(true);
    forkJoin({
      original: this.http.get(previous.file_url!, { responseType: 'text' }),
      modified: this.http.get(current.file_url!, { responseType: 'text' }),
    })
      .pipe(takeUntil(this.cancelPreview$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ original, modified }) => {
          this.previewOriginalText.set(original);
          this.previewModifiedText.set(modified);
          this.previewDiffLoading.set(false);
        },
        error: () => {
          this.previewOriginalText.set(null);
          this.previewModifiedText.set(null);
          this.previewDiffLoading.set(false);
        },
      });
  }

  private isTextPreviewable(fileUrl: string | null | undefined): boolean {
    if (!fileUrl) return false;
    const cleanUrl = fileUrl.split('?')[0].toLowerCase();
    return (
      cleanUrl.endsWith('.txt') ||
      cleanUrl.endsWith('.json') ||
      cleanUrl.endsWith('.xml') ||
      cleanUrl.endsWith('.csv') ||
      cleanUrl.endsWith('.md')
    );
  }

  /** Toggle a commit's diff panel, lazy-loading the diff on first expand. */
  toggleDiff(row: AssetVersion): void {
    if (this.expandedId() === row.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(row.id);
    this.diff.set([]);
    this.diffError.set(false);
    this.diffLoading.set(true);
    this.diffLoadingMore.set(false);
    this.loadAllVersionDiffs(row.id, 1, []);
  }

  private loadAllVersionDiffs(versionId: number, page: number, acc: ContentChange[]): void {
    this.assetContentService
      .versionDiff(this.kind, this.slug, versionId, page, DIFF_PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (this.expandedId() !== versionId) return;
          const merged = acc.concat(res.results);
          const more = merged.length < res.count && res.results.length > 0;
          // Show the first page at once and the full list when it is complete: a
          // first version lists every unit as added, which can be thousands of rows.
          // Updating only twice keeps the list's filter from resetting on every page.
          if (page === 1 || !more) {
            this.diff.set(merged);
          }
          this.diffLoading.set(false);
          this.diffLoadingMore.set(more);
          if (more) {
            this.loadAllVersionDiffs(versionId, page + 1, merged);
          }
        },
        error: () => {
          if (this.expandedId() === versionId) {
            this.diffLoading.set(false);
            this.diffLoadingMore.set(false);
            this.diffError.set(true);
          }
        },
      });
  }

  /** Mark the selected translation available (READY) or pending (DRAFT) to consumers. */
  toggleSelectedLanguageAvailability(): void {
    const lang = this.selectedLanguageObj();
    if (!lang || !this.canToggleAvailability() || this.togglingAvailability()) {
      return;
    }
    const next = !lang.is_available;
    this.togglingAvailability.set(true);
    this.assetContentService
      .setLanguageAvailability(this.kind, this.slug, lang.language, next)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.togglingAvailability.set(false);
          this.languages.update((langs) =>
            langs.map((l) => (l.language === updated.language ? updated : l))
          );
          this.message.success(
            this.translate.instant(
              next
                ? 'ADMIN.CONTENT_EDITOR.AVAILABILITY.MARKED_AVAILABLE'
                : 'ADMIN.CONTENT_EDITOR.AVAILABILITY.MARKED_PENDING'
            )
          );
        },
        error: (err: HttpErrorResponse) => {
          this.togglingAvailability.set(false);
          const name: string | undefined = err?.error?.error_name;
          const key = name ? `ADMIN.CONTENT_EDITOR.ERRORS.${name.toUpperCase()}` : '';
          const translated = key ? this.translate.instant(key) : '';
          this.message.error(
            translated && translated !== key
              ? translated
              : this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.GENERIC')
          );
        },
      });
  }

  /** Restore a version as a new published version, making it the active one. */
  restoreVersion(row: AssetVersion): void {
    if (!this.canEditContent() || this.restoringId() !== null) {
      return;
    }
    this.modal.confirm({
      nzTitle: this.translate.instant(this.t('RESTORE_CONFIRM_TITLE')),
      nzContent: this.translate.instant(this.t('RESTORE_CONFIRM_BODY'), { name: row.name }),
      nzOkText: this.translate.instant(this.t('RESTORE_OK')),
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: this.modalDirection(),
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.restoringId.set(row.id);
          this.assetContentService
            .restoreVersion(this.kind, this.slug, row.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.restoringId.set(null);
                this.message.success(this.translate.instant(this.t('MESSAGES.RESTORE_SUCCESS')));
                this.page.set(1);
                this.loadList();
                resolve();
              },
              error: () => {
                this.restoringId.set(null);
                this.message.error(this.translate.instant(this.t('MESSAGES.RESTORE_ERROR')));
                reject();
              },
            });
        }),
    });
  }

  /** Make a fully approved version the one consumers see for its language. */
  publishVersion(row: AssetVersion): void {
    if (!this.canPublish() || !row.is_approved || this.publishingId() !== null) {
      return;
    }
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.VERSION_PUBLISHING.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.VERSION_PUBLISHING.CONFIRM_BODY', {
        name: row.name,
      }),
      nzOkText: this.translate.instant('ADMIN.VERSION_PUBLISHING.CONFIRM_OK'),
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: this.modalDirection(),
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.publishingId.set(row.id);
          this.assetContentService
            .setPublishedVersion(this.kind, this.slug, row.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.publishingId.set(null);
                this.message.success(
                  this.translate.instant('ADMIN.VERSION_PUBLISHING.PUBLISH_SUCCESS', {
                    name: row.name,
                  })
                );
                this.loadList();
                resolve();
              },
              error: (err: HttpErrorResponse) => {
                this.publishingId.set(null);
                const key =
                  err.error?.error_name === 'version_not_approved'
                    ? 'ADMIN.VERSION_PUBLISHING.NOT_APPROVED_ERROR'
                    : 'ADMIN.VERSION_PUBLISHING.PUBLISH_ERROR';
                this.message.error(this.translate.instant(key));
                // The list may be stale (e.g. a review was withdrawn meanwhile).
                this.loadList();
                reject();
              },
            });
        }),
    });
  }

  /** Download a version's content (CSV of its per-ayah entries, or its file). */
  downloadVersion(row: AssetVersion): void {
    if (this.downloadingId() !== null) {
      return;
    }
    // For assets that don't support per-ayah content (mushafs, fonts, programs),
    // download directly from file_url without attempting translation export.
    if (!this.supportsLanguages()) {
      if (row.file_url) {
        this.triggerDownload(row.file_url, this.exportBaseName(row));
      } else {
        this.message.error(this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.GENERIC'));
      }
      return;
    }

    this.downloadingId.set(row.id);
    this.assetContentService
      .exportVersion(this.kind, this.slug, row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.triggerDownload(url, `${this.exportBaseName(row)}.csv`);
          URL.revokeObjectURL(url);
          this.downloadingId.set(null);
        },
        error: () => {
          if (row.file_url) {
            this.triggerDownload(row.file_url, this.exportBaseName(row));
            this.downloadingId.set(null);
            return;
          }
          this.message.error(this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.GENERIC'));
          this.downloadingId.set(null);
        },
      });
  }

  /** Exported file base name: {english name}-{language}-{version}, sanitized. */
  private exportBaseName(row: AssetVersion): string {
    const parts = [this.assetNameEn?.trim() || this.slug, row.language, row.name].filter(Boolean);
    return parts.join('-').replace(/\s+/g, '_');
  }

  private triggerDownload(href: string, filename: string): void {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.click();
  }

  truncate(text: string | null | undefined, max = 80): string {
    if (text == null || text === '') return this.translate.instant('COMMON.EM_DASH');
    const t = text.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max)}…`;
  }

  t(key: string): string {
    return `${this.i18nPrefix}.${key}`;
  }

  modalDirection(): 'rtl' | 'ltr' {
    return this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  canMutateVersions(): boolean {
    return this.adminAuth.hasPermission(VERSION_PERMISSIONS[this.kind].mutate);
  }

  /** Choosing the consumer-visible version applies to translations/tafsirs only. */
  canPublish(): boolean {
    return (
      this.supportsLanguages() &&
      this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT)
    );
  }

  canDeleteVersions(): boolean {
    return this.adminAuth.hasPermission(VERSION_PERMISSIONS[this.kind].delete);
  }
}
