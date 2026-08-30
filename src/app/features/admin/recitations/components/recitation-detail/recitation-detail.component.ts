import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { AdminTitleCountComponent } from '../../../components/admin-title-count/admin-title-count.component';
import { AdminTablePaginationComponent } from '../../../components/admin-table-pagination/admin-table-pagination.component';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { environment } from '../../../../../../environments/environment';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import { GoogleAnalyticsService } from '../../../../../core/services/google-analytics.service';
import { resolveApiErrorMessage } from '../../../../../shared/utils/api-error-resolver.util';
import {
  RecitationFolderQuality,
  type RecitationFolderOut,
  type RecitationFolderVariant,
} from '../../models/recitation-folders.models';
import type {
  RecitationSurahTrackListItem,
  RecitationTrackUploadRowState,
  RecitationTrackValidateFileStatus,
  RecitationTrackValidateUploadOut,
} from '../../models/recitation-tracks.models';
import type { RecitationTimingUploadOut } from '../../models/recitation-timings.models';
import { MaddLevel, MeemBehavior, RecitationDetails } from '../../models/recitations.models';
import { RecitationTracksUploadOrchestratorService } from '../../services/recitation-tracks-upload.orchestrator';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { RecitationsService } from '../../services/recitations.service';
import {
  FOLDER_QUALITY_ORDER,
  canEditFolderVariant,
  folderDisplayName,
  folderVariantKey,
  formatFolderVariantNames,
  isFolderVisible,
  parseFolderVariant,
  takenFolderVariantKeys,
} from '../../utils/recitation-folder.util';
import {
  buildTimingUploadExtraMessage,
  buildTimingUploadSuccessDescription,
} from '../../utils/timing-upload-result.format';
import { FolderSwitcherComponent } from '../folder-switcher/folder-switcher.component';

const TRACKS_PAGE_SIZE = 10;
const MAX_MP3_FILES = 114;

@Component({
  selector: 'app-recitation-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzModalModule,
    NzButtonModule,
    NgIcon,
    NzSkeletonModule,
    NzTagModule,
    TranslateModule,
    NzTableModule,
    AdminTitleCountComponent,
    AdminTablePaginationComponent,
    NzProgressModule,
    NzAlertModule,
    NzFormModule,
    NzSelectModule,
    NzRadioModule,
    ReactiveFormsModule,
    FolderSwitcherComponent,
  ],
  templateUrl: './recitation-detail.component.html',
  styleUrl: './recitation-detail.component.less',
})
export class RecitationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recitationsService = inject(RecitationsService);
  private readonly uploadOrchestrator = inject(RecitationTracksUploadOrchestratorService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly ga = inject(GoogleAnalyticsService);
  private readonly fb = inject(FormBuilder);

  readonly canUpdateRecitation = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_RECITATION)
  );

  readonly canDeleteRecitation = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_RECITATION)
  );

  readonly canCreateFolder = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_RECITATION)
  );

  readonly canToggleFolderVisibility = computed(
    () => environment.recitationFolderVisibility && this.canUpdateRecitation()
  );

  readonly canSetDefaultFolder = computed(() => this.canUpdateRecitation());

  readonly canUploadTiming = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPLOAD_TIMING)
  );

  readonly canViewOnGallery = computed(() => {
    const rec = this.recitation();
    return !!rec?.id && !rec.restricted_for_tenant;
  });

  readonly canViewReciter = computed(() => {
    const rec = this.recitation();
    return !!rec?.reciter?.slug;
  });

  readonly recitation = signal<RecitationDetails | null>(null);
  readonly loading = signal(true);
  readonly licensesColors = LicensesColors;
  readonly maddLevel = MaddLevel;
  readonly meemBehavior = MeemBehavior;

  readonly folders = signal<RecitationFolderOut[]>([]);
  readonly selectedFolderSlug = signal<string | null>(null);
  readonly folderFormModalVisible = signal(false);
  readonly folderFormMode = signal<'create' | 'rename'>('create');
  readonly folderFormSubmitting = signal(false);
  readonly folderFormTarget = signal<RecitationFolderOut | null>(null);
  readonly sessionTimingDownloadByFolderId = signal<Record<number, string>>({});

  readonly selectedFolder = computed(() => {
    const slug = this.selectedFolderSlug();
    return this.folders().find((f) => f.slug === slug) ?? null;
  });

  readonly timingDownloadUrl = computed(() => {
    const folder = this.selectedFolder();
    const rec = this.recitation();
    if (!folder || !rec) return null;
    const sessionUrl = this.sessionTimingDownloadByFolderId()[folder.id] ?? null;
    if (folder.is_default) {
      return rec.ayah_timings_url || sessionUrl;
    }
    return sessionUrl;
  });

  readonly folderForm = this.fb.group({
    quality: this.fb.control<RecitationFolderQuality | null>(null, {
      validators: [Validators.required],
    }),
    hasFx: this.fb.nonNullable.control(false),
  });

  /** Mirrors `folderForm` so the picker's derived state can be computed. */
  private readonly folderFormValue = signal<Partial<RecitationFolderVariant>>({});

  /** Variants already on this recitation, ignoring the folder currently being edited. */
  private readonly takenVariantKeys = computed(() =>
    takenFolderVariantKeys(this.folders(), this.folderFormTarget()?.slug)
  );

  readonly qualityOptions = computed(() => {
    const taken = this.takenVariantKeys();
    return FOLDER_QUALITY_ORDER.map((quality) => ({
      quality,
      labelKey:
        quality === RecitationFolderQuality.ORIGINAL
          ? 'ADMIN.RECITATIONS.FOLDERS.MODAL.QUALITY_ORIGINAL'
          : 'ADMIN.RECITATIONS.FOLDERS.MODAL.QUALITY_KBPS',
      labelParams: { kbps: parseInt(quality, 10) },
      // Greyed out only when neither the plain nor the effects folder is still available.
      fullyTaken:
        taken.has(folderVariantKey({ quality, hasFx: false })) &&
        taken.has(folderVariantKey({ quality, hasFx: true })),
    }));
  });

  readonly effectsOptions = computed(() => {
    const quality = this.folderFormValue().quality;
    const taken = this.takenVariantKeys();
    return [false, true].map((hasFx) => ({
      hasFx,
      label: hasFx
        ? 'ADMIN.RECITATIONS.FOLDERS.MODAL.EFFECTS_ON'
        : 'ADMIN.RECITATIONS.FOLDERS.MODAL.EFFECTS_OFF',
      taken: !!quality && taken.has(folderVariantKey({ quality, hasFx })),
    }));
  });

  /** The exact bilingual name the chosen variant will be saved under. */
  readonly folderNamePreview = computed(() => {
    const variant = this.selectedVariant();
    return variant ? formatFolderVariantNames(variant) : null;
  });

  readonly selectedVariantTaken = computed(() => {
    const variant = this.selectedVariant();
    return !!variant && this.takenVariantKeys().has(folderVariantKey(variant));
  });

  private readonly selectedVariant = computed<RecitationFolderVariant | null>(() => {
    const { quality, hasFx } = this.folderFormValue();
    return quality ? { quality, hasFx: !!hasFx } : null;
  });

  readonly tracksList = signal<RecitationSurahTrackListItem[]>([]);
  readonly tracksTotal = signal(0);
  readonly tracksLoading = signal(false);
  readonly tracksPage = signal(1);
  readonly tracksPageSize = TRACKS_PAGE_SIZE;

  readonly uploadRows = signal<RecitationTrackUploadRowState[]>([]);
  readonly validateMessage = signal<string | null>(null);
  readonly validateTopStatus = signal<'idle' | 'valid' | 'invalid'>('idle');
  readonly validateLoading = signal(false);

  readonly timingsFileInput = viewChild<ElementRef<HTMLInputElement>>('timingsFileInput');
  readonly timingsFiles = signal<File[]>([]);
  readonly timingsUploadLoading = signal(false);
  /** Last successful POST /portal/timing/upload/ response — shown in banner (not toast). */
  readonly timingsUploadResult = signal<RecitationTimingUploadOut | null>(null);

  /** Any row currently queued or uploading (may include parallel single-file runs). */
  readonly hasInFlightUploadRows = computed(() =>
    this.uploadRows().some((r) => r.phase === 'queued' || r.phase === 'uploading')
  );

  /** Valid rows that can be included in the next batch (ready, or retry after cancel/fail). */
  readonly uploadableValidCount = computed(
    () =>
      this.uploadRows().filter(
        (r) => r.validateStatus === 'valid' && ['ready', 'cancelled', 'failed'].includes(r.phase)
      ).length
  );

  readonly uploadGlobalProgress = computed(() => {
    const rows = this.uploadRows().filter(
      (r) =>
        r.validateStatus === 'valid' &&
        ['queued', 'uploading', 'success', 'failed'].includes(r.phase)
    );
    if (!rows.length) return 0;
    const sum = rows.reduce((acc, r) => acc + (r.phase === 'failed' ? 0 : r.progress), 0);
    return sum / rows.length;
  });

  /** Invalid or skipped rows — excluded when uploading a mixed selection. */
  readonly ignoredUploadCount = computed(
    () =>
      this.uploadRows().filter((r) => r.validateStatus === 'invalid' || r.validateStatus === 'skip')
        .length
  );

  readonly uploadGlobalPercentInt = computed(() =>
    Math.min(100, Math.floor(this.uploadGlobalProgress() * 100))
  );

  /** NG-ZORRO progress `nzFormat`: two-digit integer percent. */
  readonly formatNzProgressPercent = (percent: number): string => {
    const n = Math.min(100, Math.floor(percent));
    return `${String(n).padStart(2, '0')}%`;
  };

  private slug!: string;
  private readonly pendingUploadTasks = new Set<Promise<void>>();
  /** Sequence for folder-scoped track requests; guards against out-of-order responses. */
  private tracksRequestId = 0;

  constructor() {
    this.folderForm.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.folderFormValue.set({ quality: value.quality ?? undefined, hasFx: value.hasFx });
    });
  }

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasInFlightUploads()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  private hasInFlightUploads(): boolean {
    return this.hasInFlightUploadRows();
  }

  /**
   * Work that pins the active folder: queued/uploading rows, or a validation round-trip
   * whose response would otherwise be applied against the newly selected folder.
   */
  private hasBlockingFolderWork(): boolean {
    return this.hasInFlightUploadRows() || this.validateLoading();
  }

  private markInFlightAsCancelled(): void {
    this.uploadRows.update((rows) =>
      rows.map((r) =>
        r.phase === 'queued' || r.phase === 'uploading'
          ? { ...r, phase: 'cancelled', errorMessage: undefined, progress: 0 }
          : r
      )
    );
  }

  /**
   * When a batch promise settles, clear rows still **queued** for that batch only.
   * Do not touch **uploading** — another concurrent run may own that transfer (e.g. per-file restart).
   */
  private markBatchQueuedAsCancelled(filenames: ReadonlySet<string>): void {
    this.uploadRows.update((rows) =>
      rows.map((r) =>
        filenames.has(r.filename) && r.phase === 'queued'
          ? { ...r, phase: 'cancelled', errorMessage: undefined, progress: 0, uploadedBytes: 0 }
          : r
      )
    );
  }

  private applyValidateResponseForFilenames(
    res: RecitationTrackValidateUploadOut,
    filenames: ReadonlySet<string>
  ): void {
    this.validateMessage.set(res.message);
    this.validateTopStatus.set(res.status);
    const byName = new Map(res.files.map((f) => [f.filename, f.status]));
    this.uploadRows.update((prev) =>
      prev.map((row) => {
        if (!filenames.has(row.filename)) return row;
        const st = byName.get(row.filename) as RecitationTrackValidateFileStatus | undefined;
        if (!st) return row;
        if (st === 'invalid') {
          return { ...row, validateStatus: st, phase: 'invalid_validation' };
        }
        if (st === 'skip') {
          return { ...row, validateStatus: st, phase: 'skipped_validation' };
        }
        return { ...row, validateStatus: st, phase: 'ready' };
      })
    );
  }

  private trackUploadTask(task: Promise<void>): void {
    this.pendingUploadTasks.add(task);
    void task.finally(() => this.pendingUploadTasks.delete(task));
  }

  /** True while this row is already part of an active transfer (disable duplicate restart). */
  isRowUploadActive(row: RecitationTrackUploadRowState): boolean {
    return row.phase === 'queued' || row.phase === 'uploading';
  }

  canDeactivate(): Promise<boolean> | boolean {
    if (!this.hasInFlightUploads()) return true;
    return new Promise<boolean>((resolve) => {
      this.modal.confirm({
        nzTitle: this.translate.instant('ADMIN.RECITATIONS.TRACKS.NAV_LEAVE_TITLE'),
        nzContent: this.translate.instant('ADMIN.RECITATIONS.TRACKS.NAV_LEAVE_CONTENT'),
        nzOkText: this.translate.instant('ADMIN.RECITATIONS.TRACKS.NAV_LEAVE_OK'),
        nzOkType: 'primary',
        nzCancelText: this.translate.instant('ADMIN.RECITATIONS.TRACKS.NAV_LEAVE_CANCEL'),
        nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
        nzOnOk: () =>
          new Promise<void>((okResolve) => {
            this.uploadOrchestrator.abortCurrentUploadRun();
            const pending = [...this.pendingUploadTasks];
            if (pending.length === 0) {
              this.markInFlightAsCancelled();
              okResolve();
              resolve(true);
              return;
            }
            void Promise.all(pending.map((p) => p.catch(() => undefined))).finally(() => {
              this.markInFlightAsCancelled();
              okResolve();
              resolve(true);
            });
          }),
        nzOnCancel: () => resolve(false),
      });
    });
  }

  load(): void {
    this.loading.set(true);
    this.recitationsService.getDetail(this.slug).subscribe({
      next: (data) => {
        this.recitation.set(data);
        this.loading.set(false);
        this.loadFoldersThenTracks();
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private recitationSlug(): string {
    return this.recitation()?.slug ?? this.slug;
  }

  private loadFoldersThenTracks(): void {
    this.recitationsService.recitationFoldersList(this.recitationSlug()).subscribe({
      next: (list) => {
        this.folders.set(list);
        this.resolveSelectedFolder(this.route.snapshot.queryParamMap.get('folder'));
        this.loadTracksPage();
      },
      error: () => this.loadTracksPage(),
    });
  }

  private reloadFoldersSilent(): void {
    this.recitationsService.recitationFoldersList(this.recitationSlug()).subscribe({
      next: (list) => this.folders.set(list),
    });
  }

  private refreshRecitationDetailSilent(): void {
    this.recitationsService.getDetail(this.recitationSlug()).subscribe({
      next: (data) => this.recitation.set(data),
    });
  }

  private resolveSelectedFolder(querySlug: string | null): void {
    const list = this.folders();
    if (!list.length) {
      this.selectedFolderSlug.set(null);
      return;
    }
    const current = this.selectedFolderSlug();
    const currentFolder = current ? list.find((f) => f.slug === current) : undefined;
    if (currentFolder) {
      this.selectedFolderSlug.set(currentFolder.slug);
      return;
    }
    const fromQuery = querySlug ? list.find((f) => f.slug === querySlug) : undefined;
    const chosen = fromQuery ?? list.find((f) => f.is_default) ?? list[0];
    this.selectedFolderSlug.set(chosen.slug);
    this.writeFolderQueryParam(chosen.slug);
  }

  private writeFolderQueryParam(folderSlug: string): void {
    if (this.route.snapshot.queryParamMap.get('folder') === folderSlug) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { folder: folderSlug },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  folderLabel(folder: RecitationFolderOut): string {
    return folderDisplayName(folder, this.translate.currentLang);
  }

  onFolderSelect(folderSlug: string): void {
    const folder = this.folders().find((f) => f.slug === folderSlug);
    if (!folder || folder.slug === this.selectedFolderSlug()) return;
    if (!this.hasBlockingFolderWork()) {
      this.applyFolderSelection(folder);
      return;
    }
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITATIONS.TRACKS.NAV_LEAVE_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITATIONS.TRACKS.NAV_LEAVE_CONTENT'),
      nzOkText: this.translate.instant('ADMIN.RECITATIONS.TRACKS.NAV_LEAVE_OK'),
      nzOkType: 'primary',
      nzCancelText: this.translate.instant('ADMIN.RECITATIONS.TRACKS.NAV_LEAVE_CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        new Promise<void>((okResolve) => {
          this.uploadOrchestrator.abortCurrentUploadRun();
          const pending = [...this.pendingUploadTasks];
          const finish = (): void => {
            this.markInFlightAsCancelled();
            this.applyFolderSelection(folder);
            okResolve();
          };
          if (pending.length === 0) {
            finish();
            return;
          }
          void Promise.all(pending.map((p) => p.catch(() => undefined))).finally(finish);
        }),
    });
  }

  private applyFolderSelection(folder: RecitationFolderOut): void {
    this.selectedFolderSlug.set(folder.slug);
    this.writeFolderQueryParam(folder.slug);
    this.tracksPage.set(1);
    this.clearUploadSelection();
    this.clearTimingsSelection();
    this.clearTimingsUploadBanner();
    this.loadTracksPage();
  }

  openCreateFolderModal(): void {
    this.folderFormMode.set('create');
    this.folderFormTarget.set(null);
    this.folderForm.reset({ quality: null, hasFx: false });
    this.folderFormModalVisible.set(true);
  }

  /** Assigns or updates a folder's quality/effects variant. */
  openRenameFolderModal(folder: RecitationFolderOut): void {
    if (!canEditFolderVariant(folder)) return;
    const current = parseFolderVariant(folder);
    this.folderFormMode.set('rename');
    this.folderFormTarget.set(folder);
    this.folderForm.reset({
      quality: current?.quality ?? null,
      hasFx: current?.hasFx ?? false,
    });
    this.folderFormModalVisible.set(true);
  }

  onFolderFormVisibleChange(visible: boolean): void {
    this.folderFormModalVisible.set(visible);
    if (!visible) {
      this.folderFormTarget.set(null);
      this.folderFormSubmitting.set(false);
    }
  }

  submitFolderForm(): boolean | Promise<boolean> {
    const variant = this.selectedVariant();
    if (this.folderForm.invalid || !variant || this.selectedVariantTaken()) {
      this.folderForm.markAllAsTouched();
      return false;
    }
    const recSlug = this.recitationSlug();
    const body = formatFolderVariantNames(variant);
    const mode = this.folderFormMode();
    const target = this.folderFormTarget();
    if (mode === 'rename' && !target) return false;
    this.folderFormSubmitting.set(true);
    const req =
      mode === 'create'
        ? this.recitationsService.recitationFolderCreate(recSlug, body)
        : this.recitationsService.recitationFolderPatch(recSlug, target!.slug, body);

    return firstValueFrom(req)
      .then((folder) => {
        this.folderFormModalVisible.set(false);
        this.message.success(
          this.translate.instant(
            mode === 'create'
              ? 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.CREATE_OK'
              : 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.RENAME_OK'
          )
        );
        return firstValueFrom(this.recitationsService.recitationFoldersList(recSlug)).then(
          (list) => {
            this.folders.set(list);
            if (mode === 'create') {
              const created = list.find((f) => f.slug === folder.slug) ?? folder;
              this.applyFolderSelection(created);
            }
            return true;
          }
        );
      })
      .catch((err: unknown) => {
        this.message.error(
          resolveApiErrorMessage(
            err,
            { fallbackKey: 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.SAVE_ERROR' },
            this.translate
          )
        );
        throw err;
      })
      .finally(() => this.folderFormSubmitting.set(false));
  }

  /**
   * Flips a folder's public visibility. Reachable only while
   * `environment.recitationFolderVisibility` is on, i.e. once the API accepts `is_visible`.
   */
  onToggleFolderVisibility(folder: RecitationFolderOut): void {
    if (!this.canToggleFolderVisibility() || folder.is_default) return;
    const nextVisible = !isFolderVisible(folder);
    firstValueFrom(
      this.recitationsService.recitationFolderPatch(this.recitationSlug(), folder.slug, {
        is_visible: nextVisible,
      })
    )
      .then((updated) => {
        this.folders.update((list) =>
          list.map((f) => (f.slug === folder.slug ? { ...f, ...updated } : f))
        );
        this.message.success(
          this.translate.instant(
            nextVisible
              ? 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.SHOWN_OK'
              : 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.HIDDEN_OK'
          )
        );
      })
      .catch((err: unknown) => {
        this.message.error(
          resolveApiErrorMessage(
            err,
            { fallbackKey: 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.SAVE_ERROR' },
            this.translate
          )
        );
      });
  }

  confirmSetDefaultFolder(folder: RecitationFolderOut): void {
    if (!this.canSetDefaultFolder() || folder.is_default) return;
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITATIONS.FOLDERS.SET_DEFAULT_CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITATIONS.FOLDERS.SET_DEFAULT_CONFIRM_BODY', {
        name: this.folderLabel(folder),
      }),
      nzOkText: this.translate.instant('ADMIN.RECITATIONS.FOLDERS.SET_AS_DEFAULT'),
      nzOkType: 'primary',
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        firstValueFrom(
          this.recitationsService.recitationFolderPatch(this.recitationSlug(), folder.slug, {
            is_default: true,
          })
        )
          .then(() =>
            firstValueFrom(this.recitationsService.recitationFoldersList(this.recitationSlug()))
          )
          .then((list) => {
            this.folders.set(list);
            this.refreshRecitationDetailSilent();
            this.message.success(
              this.translate.instant('ADMIN.RECITATIONS.FOLDERS.MESSAGES.SET_DEFAULT_OK')
            );
          })
          .catch((err: unknown) => {
            this.message.error(
              resolveApiErrorMessage(
                err,
                { fallbackKey: 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.SAVE_ERROR' },
                this.translate
              )
            );
            return Promise.reject(err);
          }),
    });
  }

  confirmDeleteFolder(folder: RecitationFolderOut): void {
    if (folder.is_default) return;
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITATIONS.FOLDERS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITATIONS.FOLDERS.DELETE.CONFIRM_BODY', {
        name: this.folderLabel(folder),
        count: folder.tracks_count,
      }),
      nzOkText: this.translate.instant('ADMIN.RECITATIONS.FOLDERS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        firstValueFrom(
          this.recitationsService.recitationFolderDelete(this.recitationSlug(), folder.slug)
        )
          .then(() =>
            firstValueFrom(this.recitationsService.recitationFoldersList(this.recitationSlug()))
          )
          .then((list) => {
            this.sessionTimingDownloadByFolderId.update((map) => {
              const next = { ...map };
              delete next[folder.id];
              return next;
            });
            this.folders.set(list);
            this.message.success(
              this.translate.instant('ADMIN.RECITATIONS.FOLDERS.MESSAGES.DELETE_OK')
            );
            const fallback = list.find((f) => f.is_default) ?? list[0];
            if (fallback) {
              this.applyFolderSelection(fallback);
            } else {
              this.selectedFolderSlug.set(null);
              this.tracksList.set([]);
              this.tracksTotal.set(0);
            }
          })
          .catch((err: unknown) => {
            this.message.error(
              resolveApiErrorMessage(
                err,
                { fallbackKey: 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.DELETE_ERROR' },
                this.translate
              )
            );
            return Promise.reject(err);
          }),
    });
  }

  loadTracksPage(): void {
    const rec = this.recitation();
    if (!rec) return;
    // Only the newest request may write the list, so a response for a folder or page
    // the user has already navigated away from is dropped instead of overwriting it.
    const requestId = ++this.tracksRequestId;
    this.tracksLoading.set(true);
    this.recitationsService
      .recitationTracksList({
        recitation_slug: rec.slug ?? this.slug,
        asset_id: rec.id,
        page: this.tracksPage(),
        page_size: this.tracksPageSize,
        folder: this.selectedFolderSlug() ?? undefined,
      })
      .subscribe({
        next: (res) => {
          if (requestId !== this.tracksRequestId) return;
          this.tracksList.set(res.results);
          this.tracksTotal.set(res.count);
          this.tracksLoading.set(false);
        },
        error: () => {
          if (requestId !== this.tracksRequestId) return;
          this.tracksLoading.set(false);
        },
      });
  }

  onTracksPageChange(page: number): void {
    this.tracksPage.set(page);
    this.loadTracksPage();
  }

  onPickTimingsFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const list = input.files;
    if (!list?.length) {
      this.timingsFiles.set([]);
      return;
    }
    this.timingsUploadResult.set(null);
    this.timingsFiles.set(Array.from(list));
  }

  clearTimingsSelection(): void {
    this.timingsFiles.set([]);
    this.timingsUploadResult.set(null);
    const el = this.timingsFileInput()?.nativeElement;
    if (el) el.value = '';
  }

  onUploadTimings(): void {
    const rec = this.recitation();
    const files = this.timingsFiles();
    if (!rec || files.length === 0 || this.timingsUploadLoading()) return;

    this.timingsUploadLoading.set(true);
    this.timingsUploadResult.set(null);
    this.recitationsService
      .recitationTimingUpload(rec.id, files, this.selectedFolder()?.id)
      .subscribe({
        next: (res: RecitationTimingUploadOut) => {
          this.timingsUploadResult.set(res);
          this.timingsFiles.set([]);
          const el = this.timingsFileInput()?.nativeElement;
          if (el) el.value = '';
          const folderId = res.folder_id ?? this.selectedFolder()?.id;
          if (folderId != null && res.synced_file_url) {
            this.sessionTimingDownloadByFolderId.update((map) => ({
              ...map,
              [folderId]: res.synced_file_url as string,
            }));
          }
          this.load();
        },
        error: (err: unknown) => {
          // Global `errorInterceptor` already shows `error.error.message` — do not duplicate.
          // Show only structured `extra` (e.g. ResultDict) when present.
          if (!(err instanceof HttpErrorResponse)) return;
          const body = err.error;
          const extra =
            body && typeof body === 'object' && 'extra' in body
              ? (body as { extra?: unknown }).extra
              : undefined;
          const detail = buildTimingUploadExtraMessage(extra, this.translate);
          if (detail) {
            this.message.error(detail, { nzDuration: 12000 });
          }
        },
        complete: () => this.timingsUploadLoading.set(false),
      });
  }

  clearTimingsUploadBanner(): void {
    this.timingsUploadResult.set(null);
  }

  timingsSuccessBannerDescription(out: RecitationTimingUploadOut): string {
    return buildTimingUploadSuccessDescription(out, this.translate);
  }

  onPickMp3Files(event: Event): void {
    const input = event.target as HTMLInputElement;
    const list = input.files;
    if (!list?.length) return;

    const files = Array.from(list).filter((f) => /\.mp3$/i.test(f.name));
    if (files.length > MAX_MP3_FILES) {
      this.message.warning(
        this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.MAX_FILES', {
          max: MAX_MP3_FILES,
        })
      );
      input.value = '';
      return;
    }

    const rows: RecitationTrackUploadRowState[] = files.map((file) => ({
      file,
      filename: file.name,
      phase: 'pending_validation',
      progress: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
    }));
    this.uploadRows.set(rows);
    this.clearValidateUi();
    this.runValidate();
    input.value = '';
  }

  clearUploadSelection(): void {
    this.uploadRows.set([]);
    this.clearValidateUi();
  }

  private clearValidateUi(): void {
    this.validateMessage.set(null);
    this.validateTopStatus.set('idle');
  }

  /** Keep only rows the user can retry after a batch upload. */
  private pruneActionableUploadRows(): void {
    this.uploadRows.update((rows) =>
      rows.filter((r) => r.phase === 'failed' || r.phase === 'cancelled')
    );
  }

  private runValidate(): void {
    const rec = this.recitation();
    if (!rec) return;
    const rows = this.uploadRows();
    if (!rows.length) return;

    const allNames = new Set(rows.map((r) => r.filename));
    this.validateLoading.set(true);
    this.recitationsService
      .recitationTracksValidateUpload({
        asset_id: rec.id,
        filenames: rows.map((r) => r.filename),
        folder_id: this.selectedFolder()?.id,
      })
      .subscribe({
        next: (res) => {
          this.applyValidateResponseForFilenames(res, allNames);
          this.validateLoading.set(false);
        },
        error: () => {
          this.validateLoading.set(false);
          this.message.error(
            this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.VALIDATE_ERROR')
          );
        },
      });
  }

  onUploadClick(): void {
    if (this.validateLoading() || this.uploadableValidCount() === 0) {
      return;
    }
    const ignored = this.ignoredUploadCount();
    const willUpload = this.uploadableValidCount();
    if (ignored > 0) {
      this.modal.confirm({
        nzTitle: this.translate.instant('ADMIN.RECITATIONS.TRACKS.UPLOAD_MIXED_CONFIRM_TITLE'),
        nzContent: this.translate.instant('ADMIN.RECITATIONS.TRACKS.UPLOAD_MIXED_CONFIRM_CONTENT', {
          ignored,
          valid: willUpload,
        }),
        nzOkText: this.translate.instant('ADMIN.RECITATIONS.TRACKS.UPLOAD_MIXED_CONFIRM_OK'),
        nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
        nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
        nzOnOk: () => {
          this.removeInvalidAndSkippedUploadRowsAndClearValidateUi();
          void this.startUpload();
          return Promise.resolve();
        },
      });
      return;
    }
    void this.startUpload();
  }

  uploadProgressPercent(progress01: number): number {
    return Math.min(100, Math.floor((progress01 ?? 0) * 100));
  }

  canRemoveUploadRow(row: RecitationTrackUploadRowState): boolean {
    if (this.hasInFlightUploadRows() || this.validateLoading()) return false;
    return ['pending_validation', 'invalid_validation', 'skipped_validation', 'ready'].includes(
      row.phase
    );
  }

  removeUploadRow(row: RecitationTrackUploadRowState): void {
    if (!this.canRemoveUploadRow(row)) return;
    this.uploadRows.update((rows) => rows.filter((r) => r.filename !== row.filename));
    if (!this.uploadRows().length) {
      this.clearValidateUi();
      return;
    }
    this.runValidate();
  }

  /** After user confirms a mixed batch upload: drop invalid/skip rows and hide the validate alert. */
  private removeInvalidAndSkippedUploadRowsAndClearValidateUi(): void {
    this.uploadRows.update((rows) =>
      rows.filter((r) => r.validateStatus !== 'invalid' && r.validateStatus !== 'skip')
    );
    this.clearValidateUi();
    const remaining = this.uploadRows();
    if (!remaining.length) {
      this.validateTopStatus.set('idle');
      return;
    }
    this.validateTopStatus.set('valid');
  }

  async startUpload(): Promise<void> {
    const rec = this.recitation();
    if (!rec) return;

    const candidates = this.uploadRows().filter(
      (r) => r.validateStatus === 'valid' && ['ready', 'cancelled', 'failed'].includes(r.phase)
    );
    if (!candidates.length) return;

    const candidateSet = new Set(candidates.map((r) => r.filename));

    const folderId = this.selectedFolder()?.id;

    this.validateLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.recitationsService.recitationTracksValidateUpload({
          asset_id: rec.id,
          filenames: candidates.map((r) => r.filename),
          folder_id: folderId,
        })
      );
      this.applyValidateResponseForFilenames(res, candidateSet);
    } catch {
      this.message.error(
        this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.VALIDATE_ERROR')
      );
      return;
    } finally {
      this.validateLoading.set(false);
    }

    const toUpload = this.uploadRows().filter(
      (r) => candidateSet.has(r.filename) && r.validateStatus === 'valid' && r.phase === 'ready'
    );
    if (!toUpload.length) return;

    this.clearValidateUi();

    const batchFilenames = new Set(toUpload.map((r) => r.filename));
    toUpload.forEach((r) => {
      this.patchUploadRow(r.filename, {
        phase: 'queued',
        progress: 0,
        uploadedBytes: 0,
        errorMessage: undefined,
      });
    });

    const task = this.uploadOrchestrator.uploadAllFiles(
      rec.id,
      toUpload.map((r) => ({ filename: r.filename, blob: r.file })),
      {
        onRowPatch: (filename, patch) => {
          this.patchUploadRow(filename, patch);
        },
      },
      folderId
    );
    this.trackUploadTask(task);

    try {
      await task;

      const rowsAfter = this.uploadRows();
      const ok = toUpload.filter(
        (r) => rowsAfter.find((x) => x.filename === r.filename)?.phase === 'success'
      ).length;
      const failed = toUpload.length - ok;

      if (failed === 0) {
        this.message.success(
          this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.UPLOAD_ALL_OK', { count: ok })
        );
        void this.router.navigate(['/gallery/asset', rec.id]);
      } else {
        this.message.warning(
          this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.UPLOAD_PARTIAL', {
            ok,
            failed,
          })
        );
        this.clearValidateUi();
        this.pruneActionableUploadRows();
        this.reloadFoldersSilent();
        this.loadTracksPage();
      }
    } finally {
      this.markBatchQueuedAsCancelled(batchFilenames);
    }
  }

  /** Prompts, then stops every in-flight / queued upload. */
  confirmAbortAllUploads(): void {
    if (!this.hasInFlightUploadRows()) return;
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITATIONS.TRACKS.ABORT_ALL_CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITATIONS.TRACKS.ABORT_ALL_CONFIRM_CONTENT'),
      nzOkText: this.translate.instant('ADMIN.RECITATIONS.TRACKS.ABORT_ALL_CONFIRM_OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () => {
        this.abortAllUploads();
        return Promise.resolve();
      },
    });
  }

  /** Stops every in-flight / queued upload (after confirm). */
  private abortAllUploads(): void {
    if (!this.hasInFlightUploadRows()) return;
    this.uploadOrchestrator.abortCurrentUploadRun();
  }

  /** Cancels only this file’s multipart + PUTs; other files (in this or other runs) continue. */
  abortSingleUploadingRow(row: RecitationTrackUploadRowState): void {
    if (row.phase !== 'uploading') return;
    this.uploadOrchestrator.abortSingleFileUpload(row.filename);
  }

  async retryUploadRow(row: RecitationTrackUploadRowState): Promise<void> {
    const rec = this.recitation();
    if (!rec) return;
    if (row.phase !== 'failed' && row.phase !== 'cancelled') return;
    if (this.isRowUploadActive(row)) return;

    const fn = row.filename;
    const one = new Set([fn]);

    const folderId = this.selectedFolder()?.id;

    this.validateLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.recitationsService.recitationTracksValidateUpload({
          asset_id: rec.id,
          filenames: [fn],
          folder_id: folderId,
        })
      );
      this.applyValidateResponseForFilenames(res, one);
    } catch {
      this.message.error(
        this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.VALIDATE_ERROR')
      );
      return;
    } finally {
      this.validateLoading.set(false);
    }

    const updated = this.uploadRows().find((r) => r.filename === fn);
    if (!updated || updated.validateStatus !== 'valid' || updated.phase !== 'ready') {
      return;
    }

    this.clearValidateUi();

    this.patchUploadRow(fn, {
      phase: 'queued',
      progress: 0,
      uploadedBytes: 0,
      errorMessage: undefined,
    });
    const task = this.uploadOrchestrator.uploadAllFiles(
      rec.id,
      [{ filename: fn, blob: updated.file }],
      {
        onRowPatch: (filename, patch) => {
          this.patchUploadRow(filename, patch);
        },
      },
      folderId
    );
    this.trackUploadTask(task);
    void task.then(() => {
      const row = this.uploadRows().find((r) => r.filename === fn);
      if (row?.phase === 'success') {
        this.clearValidateUi();
        this.pruneActionableUploadRows();
      }
      this.reloadFoldersSilent();
      this.loadTracksPage();
    });
  }

  deleteTrack(track: RecitationSurahTrackListItem): void {
    const rec = this.recitation();
    if (!rec) return;
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITATIONS.TRACKS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITATIONS.TRACKS.DELETE.CONFIRM_BODY', {
        surah: track.surah_number,
      }),
      nzOkText: this.translate.instant('ADMIN.RECITATIONS.TRACKS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.RECITATIONS.TRACKS.DELETE.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.recitationsService
            .recitationTracksDelete({ asset_id: rec.id, track_ids: [track.id] })
            .subscribe({
              next: () => {
                this.message.success(
                  this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.DELETE_OK')
                );
                this.reloadFoldersSilent();
                this.loadTracksPage();
                resolve();
              },
              error: () => {
                this.message.error(
                  this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.DELETE_ERROR')
                );
                reject();
              },
            });
        }),
    });
  }

  private patchUploadRow(filename: string, patch: Partial<RecitationTrackUploadRowState>): void {
    this.uploadRows.update((rows) =>
      rows.map((r) => (r.filename === filename ? { ...r, ...patch } : r))
    );
  }

  rowStatusLabel(row: RecitationTrackUploadRowState): string {
    if (row.phase === 'pending_validation' || this.validateLoading()) {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.STATUS.VALIDATING');
    }
    if (row.phase === 'invalid_validation') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.STATUS.INVALID');
    }
    if (row.phase === 'skipped_validation') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.STATUS.SKIPPED');
    }
    if (row.phase === 'ready') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.STATUS.READY');
    }
    if (row.phase === 'queued') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.STATUS.QUEUED');
    }
    if (row.phase === 'uploading') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.STATUS.UPLOADING');
    }
    if (row.phase === 'success') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.STATUS.DONE');
    }
    if (row.phase === 'failed') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.STATUS.FAILED');
    }
    if (row.phase === 'cancelled') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.STATUS.CANCELLED');
    }
    return '';
  }

  galleryAssetUrl(): string {
    const id = this.recitation()?.id;
    return id ? `/gallery/asset/${id}` : '';
  }

  onViewOnGalleryClick(): void {
    const rec = this.recitation();
    if (!rec?.id) return;
    this.ga.trackEvent('view_on_gallery', { asset_id: rec.id, source: 'recitation_detail' });
  }

  reciterRouterLink(): string[] {
    const reciterSlug = this.recitation()?.reciter?.slug;
    return reciterSlug ? ['/admin/reciters', reciterSlug] : [];
  }

  onEdit(): void {
    void this.router.navigate(['/admin/recitations', this.slug, 'edit']);
  }

  onDelete(): void {
    const name =
      this.recitation()?.name_ar ?? this.translate.instant('ADMIN.RECITATIONS.DELETE.DEFAULT_NAME');
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITATIONS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITATIONS.DELETE.CONFIRM_BODY', { name }),
      nzOkText: this.translate.instant('ADMIN.RECITATIONS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.RECITATIONS.DELETE.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        this.recitationsService.delete(this.slug).subscribe({
          next: () => {
            this.message.success(
              this.translate.instant('ADMIN.RECITATIONS.MESSAGES.DELETE_SUCCESS')
            );
            void this.router.navigate(['/admin/recitations']);
          },
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  maddLabel(level: MaddLevel | null | undefined): string {
    if (level === MaddLevel.TWASSUT) {
      return this.translate.instant('ADMIN.RECITATIONS.FILTERS.MADD_TWASSUT');
    }
    if (level === MaddLevel.QASR) {
      return this.translate.instant('ADMIN.RECITATIONS.FILTERS.MADD_QASR');
    }
    return '';
  }

  meemLabel(b: MeemBehavior | null | undefined): string {
    if (b === MeemBehavior.SILAH) {
      return this.translate.instant('ADMIN.RECITATIONS.FORM.MEEM_WASL_LONG');
    }
    if (b === MeemBehavior.SKOUN) {
      return this.translate.instant('ADMIN.RECITATIONS.FILTERS.MEEM_SKOUN');
    }
    return '';
  }

  formatDurationMs(ms: number | null | undefined): string {
    if (ms == null || ms <= 0) return this.translate.instant('COMMON.EM_DASH');
    const totalSec = Math.round(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  formatBytes(n: number | null | undefined): string {
    if (n == null || n <= 0) return this.translate.instant('COMMON.EM_DASH');
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }
}
