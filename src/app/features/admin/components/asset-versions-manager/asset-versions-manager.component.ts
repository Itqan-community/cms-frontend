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
import { AdminTitleCountComponent } from '../admin-title-count/admin-title-count.component';
import { AdminTablePaginationComponent } from '../admin-table-pagination/admin-table-pagination.component';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { UniversalAssetPreviewerComponent } from '../universal-asset-previewer/universal-asset-previewer.component';
import { Subject, debounceTime, distinctUntilChanged, finalize, forkJoin, takeUntil } from 'rxjs';
import type { AssetVersion, AssetVersionParentKind } from '../../models/asset-versions.models';
import type { AssetLanguage, ContentChange } from '../../models/asset-content.models';
import { AssetVersionsService } from '../../services/asset-versions.service';
import { AssetContentService } from '../../services/asset-content.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import { localizedLanguageName } from '../../utils/iso-639.util';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';

const DEFAULT_PAGE_SIZE = 10;

@Component({
  selector: 'app-asset-versions-manager',
  standalone: true,
  imports: [
    DatePipe,
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
  /** Emits to abort the in-flight versions request. */
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
  readonly searchTerm = signal('');
  readonly selectedFileName = signal<string | null>(null);
  private selectedFile: File | null = null;

  /** Create/edit popup visibility. */
  readonly versionModalOpen = signal(false);
  readonly versionModalTitleKey = signal('');
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingId = signal<number | null>(null);
  readonly versionLanguage = signal<string | null>(null);
  readonly missingVersionLanguage = computed(
    () => this.modalMode() === 'create' && this.supportsLanguages() && !this.versionLanguage()
  );

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    summary: ['', [Validators.required]],
  });

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

  private loadLanguages(): void {
    this.assetContentService
      .getLanguages(this.kind, this.slug)
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
          const stored = this.lastLanguage.getLanguage(this.kind, this.slug);
          const remembered = stored && langs.some((l) => l.language === stored) ? stored : null;
          const defaultLang = remembered ?? langs[0].language;
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
    this.lastLanguage.setLanguage(this.kind, this.slug, lang);
    this.page.set(1);
    this.loadList();
  }

  onSearchInput(value: string): void {
    this.search$.next(value);
  }

  onPageChange(p: number): void {
    if (p === this.page()) return;
    this.page.set(p);
    this.loadList();
  }

  onPageSizeChange(size: number): void {
    if (size === this.pageSize()) return;
    this.pageSize.set(size);
    this.page.set(1);
    this.loadList();
  }

  private loadList(): void {
    this.cancelInFlightList$.next();
    this.loading.set(true);
    const lang = this.supportsLanguages() ? (this.selectedLanguage() ?? undefined) : undefined;
    this.assetVersionsService
      .list(this.kind, this.slug, {
        page: this.page(),
        page_size: this.pageSize(),
        search: this.searchTerm(),
        language: lang,
      })
      .pipe(
        takeUntil(this.cancelInFlightList$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (res) => {
          this.list.set(res.results);
          this.total.set(res.count);
        },
        error: (err: HttpErrorResponse) => {
          this.list.set([]);
          this.total.set(0);
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

  openCreateModal(): void {
    if (!this.canMutateVersions()) return;
    this.modalMode.set('create');
    this.editingId.set(null);
    this.versionModalTitleKey.set(this.t('CREATE_TITLE'));
    this.selectedFileName.set(null);
    this.selectedFile = null;

    if (this.supportsLanguages()) {
      const activeLang = this.selectedLanguage();
      const validActive = activeLang && this.languages().some((l) => l.language === activeLang);
      const fallback = validActive ? activeLang : (this.languages()[0]?.language ?? null);
      this.versionLanguage.set(fallback);
    } else {
      this.versionLanguage.set(null);
    }

    this.form.reset({ name: '', summary: '' });
    this.versionModalOpen.set(true);
  }

  openEditModal(row: AssetVersion): void {
    if (!this.canMutateVersions()) return;
    this.modalMode.set('edit');
    this.editingId.set(row.id);
    this.versionModalTitleKey.set(this.t('EDIT_TITLE'));
    this.selectedFileName.set(null);
    this.selectedFile = null;
    this.versionLanguage.set(row.language ?? null);
    this.form.reset({ name: row.name, summary: row.summary });
    this.versionModalOpen.set(true);
  }

  closeVersionModal(): void {
    if (this.saving()) return;
    this.abortInFlightSave();
    this.versionModalOpen.set(false);
  }

  onVersionModalVisibleChange(visible: boolean): void {
    if (!visible) this.closeVersionModal();
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    this.selectedFileName.set(file.name);
  }

  submit(): void {
    if (!this.canMutateVersions() || this.missingVersionLanguage()) return;
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => c.markAsTouched());
      return;
    }
    if (this.modalMode() === 'create' && !this.selectedFile) {
      this.message.error(this.translate.instant(this.t('FILE_REQUIRED_ERR')));
      return;
    }

    const id = this.editingId();
    const payload = {
      asset_id: this.assetId,
      name: this.form.getRawValue().name,
      summary: this.form.getRawValue().summary,
      file: this.selectedFile ?? undefined,
      language:
        id == null && this.supportsLanguages() ? (this.versionLanguage() ?? undefined) : undefined,
    };

    this.abortInFlightSave();
    this.saving.set(true);

    const req$ =
      id == null
        ? this.assetVersionsService.create(this.kind, this.slug, payload)
        : this.assetVersionsService.update(this.kind, this.slug, id, payload);

    req$
      .pipe(
        takeUntil(this.cancelInFlightSubmit$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.message.success(
            this.translate.instant(
              id == null ? this.t('MESSAGES.CREATE_SUCCESS') : this.t('MESSAGES.EDIT_SUCCESS')
            )
          );
          this.closeVersionModal();
          this.loadList();
        },
        error: (err: HttpErrorResponse) => {
          const name: string | undefined = err?.error?.error_name;
          const key = name ? `ADMIN.CONTENT_EDITOR.ERRORS.${name.toUpperCase()}` : '';
          const translated = key ? this.translate.instant(key) : '';
          this.message.error(
            translated && translated !== key
              ? translated
              : this.translate.instant(this.t('MESSAGES.SAVE_ERROR'))
          );
        },
      });
  }

  private abortInFlightSave(): void {
    this.cancelInFlightSubmit$.next();
  }

  deleteRow(row: AssetVersion): void {
    if (!this.canDeleteVersions()) return;
    this.modal.confirm({
      nzTitle: this.translate.instant(this.t('DELETE_CONFIRM_TITLE')),
      nzContent: this.translate.instant(this.t('DELETE_CONFIRM_BODY'), { name: row.name }),
      nzOkText: this.translate.instant(this.t('DELETE_OK')),
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: this.modalDirection(),
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.assetVersionsService
            .delete(this.kind, this.slug, row.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.message.success(this.translate.instant(this.t('MESSAGES.DELETE_SUCCESS')));
                if (this.list().length === 1 && this.page() > 1) {
                  this.page.update((p) => p - 1);
                }
                this.loadList();
                resolve();
              },
              error: (err: HttpErrorResponse) => {
                const name: string | undefined = err?.error?.error_name;
                const key = name ? `ADMIN.CONTENT_EDITOR.ERRORS.${name.toUpperCase()}` : '';
                const translated = key ? this.translate.instant(key) : '';
                this.message.error(
                  translated && translated !== key
                    ? translated
                    : this.translate.instant(this.t('MESSAGES.DELETE_ERROR'))
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

  /** Toggle a commit's diff panel. */
  toggleDiff(row: AssetVersion): void {
    if (this.expandedId() === row.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(row.id);
    this.diff.set([]);
    this.diffLoading.set(true);
    this.loadAllVersionDiffs(row.id, 1, []);
  }

  private loadAllVersionDiffs(versionId: number, page: number, acc: ContentChange[]): void {
    this.assetContentService
      .versionDiff(this.kind, this.slug, versionId, page, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (this.expandedId() !== versionId) return;
          const merged = acc.concat(res.results);
          if (merged.length < res.count && res.results.length > 0) {
            this.loadAllVersionDiffs(versionId, page + 1, merged);
          } else {
            this.diff.set(merged);
            this.diffLoading.set(false);
          }
        },
        error: () => {
          if (this.expandedId() === versionId) {
            this.diffLoading.set(false);
          }
        },
      });
  }

  toggleSelectedLanguageAvailability(): void {
    const lang = this.selectedLanguageObj();
    if (!lang || !this.canToggleAvailability() || this.togglingAvailability()) return;
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

  restoreVersion(row: AssetVersion): void {
    if (!this.canMutateVersions() || this.restoringId() !== null) return;
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

  downloadVersion(row: AssetVersion): void {
    if (this.downloadingId() !== null) return;
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

  truncate(summary: string): string {
    if (!summary) return '—';
    return summary.length > 90 ? `${summary.slice(0, 90)}...` : summary;
  }

  formatBytes(bytes: number | null | undefined): string {
    if (bytes == null || isNaN(bytes) || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  t(subKey: string): string {
    return `${this.i18nPrefix}.${subKey}`;
  }

  modalDirection(): 'rtl' | 'ltr' {
    return this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  canMutateVersions(): boolean {
    return this.adminAuth.hasPermission(PORTAL_PERMISSIONS.CATALOG_MUTATE);
  }

  canDeleteVersions(): boolean {
    return this.adminAuth.hasPermission(PORTAL_PERMISSIONS.CATALOG_DELETE);
  }
}
