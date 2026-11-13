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
import { finalize, firstValueFrom } from 'rxjs';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { environment } from '../../../../../../environments/environment';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import { GoogleAnalyticsService } from '../../../../../core/services/google-analytics.service';
import { resolveApiErrorMessage } from '../../../../../shared/utils/api-error-resolver.util';
import {
  RecitationQualityBitrate,
  type RecitationQualityOut,
  type RecitationQualityVariant,
} from '../../models/recitation-qualities.models';
import type {
  RecitationSurahTrackListItem,
  RecitationTrackUploadRowState,
  RecitationTrackValidateFileStatus,
  RecitationTrackValidateUploadOut,
} from '../../models/recitation-tracks.models';
import type { RecitationTimingUploadOut } from '../../models/recitation-timings.models';
import { MaddLevel, MeemBehavior, RecitationDetails } from '../../models/recitations.models';
import {
  RECITATION_TRACKS_CONCURRENCY_OPTIONS,
  RecitationTracksUploadOrchestratorService,
} from '../../services/recitation-tracks-upload.orchestrator';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { RecitationsService } from '../../services/recitations.service';
import {
  QUALITY_BITRATE_ORDER,
  canEditQualityVariant,
  qualityDisplayName,
  qualityVariantKey,
  formatQualityVariantNames,
  isQualityVisible,
  parseQualityVariant,
  takenQualityVariantKeys,
} from '../../utils/recitation-quality.util';
import {
  buildTimingUploadExtraMessage,
  buildTimingUploadSuccessDescription,
} from '../../utils/timing-upload-result.format';
import { QualitySwitcherComponent } from '../quality-switcher/quality-switcher.component';
import { AssetUsageSectionComponent } from '../../../../usage/components/asset-usage-section/asset-usage-section.component';
import { AssetChannelTagsComponent } from '../../../components/asset-channels/asset-channels.component';

const TRACKS_PAGE_SIZE = 10;
const MAX_MP3_FILES = 114;

@Component({
  selector: 'app-recitation-detail',
  standalone: true,
  imports: [
    AssetChannelTagsComponent,
    AssetUsageSectionComponent,
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
    NzToolTipModule,
    NzRadioModule,
    FormsModule,
    ReactiveFormsModule,
    QualitySwitcherComponent,
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

  readonly uploadConcurrencyOptions = RECITATION_TRACKS_CONCURRENCY_OPTIONS;
  readonly uploadConcurrency = this.uploadOrchestrator.fileConcurrency;

  readonly canUpdateRecitation = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_RECITATION)
  );

  readonly canDeleteRecitation = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_RECITATION)
  );

  readonly canCreateQuality = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_RECITATION)
  );

  readonly canToggleQualityVisibility = computed(
    () => environment.recitationQualityVisibility && this.canUpdateRecitation()
  );

  readonly canSetDefaultQuality = computed(() => this.canUpdateRecitation());

  readonly canUploadTiming = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPLOAD_TIMING)
  );

  readonly canViewOnGallery = computed(() => {
    const rec = this.recitation();
    return !!rec?.id && rec.in_gallery;
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

  readonly qualities = signal<RecitationQualityOut[]>([]);
  readonly selectedQualitySlug = signal<string | null>(null);
  readonly qualityFormModalVisible = signal(false);
  readonly qualityFormMode = signal<'create' | 'rename'>('create');
  readonly qualityFormSubmitting = signal(false);
  readonly qualityFormTarget = signal<RecitationQualityOut | null>(null);
  readonly sessionTimingDownloadByQualityId = signal<Record<number, string>>({});

  readonly selectedQuality = computed(() => {
    const slug = this.selectedQualitySlug();
    return this.qualities().find((f) => f.slug === slug) ?? null;
  });

  readonly timingDownloadUrl = computed(() => {
    const quality = this.selectedQuality();
    const rec = this.recitation();
    if (!quality || !rec) return null;
    const sessionUrl = this.sessionTimingDownloadByQualityId()[quality.id] ?? null;
    if (quality.is_default) {
      return rec.ayah_timings_url || sessionUrl;
    }
    return sessionUrl;
  });

  readonly qualityForm = this.fb.group({
    quality: this.fb.control<RecitationQualityBitrate | null>(null, {
      validators: [Validators.required],
    }),
    hasFx: this.fb.nonNullable.control(false),
  });

  /** Mirrors `qualityForm` so the picker's derived state can be computed. */
  private readonly qualityFormValue = signal<Partial<RecitationQualityVariant>>({});

  /** Variants already on this recitation, ignoring the quality currently being edited. */
  private readonly takenVariantKeys = computed(() =>
    takenQualityVariantKeys(this.qualities(), this.qualityFormTarget()?.slug)
  );

  readonly qualityOptions = computed(() => {
    const taken = this.takenVariantKeys();
    return QUALITY_BITRATE_ORDER.map((quality) => ({
      quality,
      labelKey:
        quality === RecitationQualityBitrate.ORIGINAL
          ? 'ADMIN.RECITATIONS.QUALITIES.MODAL.QUALITY_ORIGINAL'
          : 'ADMIN.RECITATIONS.QUALITIES.MODAL.QUALITY_KBPS',
      labelParams: { kbps: parseInt(quality, 10) },
      // Greyed out only when neither the plain nor the effects quality is still available.
      fullyTaken:
        taken.has(qualityVariantKey({ quality, hasFx: false })) &&
        taken.has(qualityVariantKey({ quality, hasFx: true })),
    }));
  });

  readonly effectsOptions = computed(() => {
    const quality = this.qualityFormValue().quality;
    const taken = this.takenVariantKeys();
    return [false, true].map((hasFx) => ({
      hasFx,
      label: hasFx
        ? 'ADMIN.RECITATIONS.QUALITIES.MODAL.EFFECTS_ON'
        : 'ADMIN.RECITATIONS.QUALITIES.MODAL.EFFECTS_OFF',
      taken: !!quality && taken.has(qualityVariantKey({ quality, hasFx })),
    }));
  });

  /** The exact bilingual name the chosen variant will be saved under. */
  readonly qualityNamePreview = computed(() => {
    const variant = this.selectedVariant();
    return variant ? formatQualityVariantNames(variant) : null;
  });

  readonly selectedVariantTaken = computed(() => {
    const variant = this.selectedVariant();
    return !!variant && this.takenVariantKeys().has(qualityVariantKey(variant));
  });

  private readonly selectedVariant = computed<RecitationQualityVariant | null>(() => {
    const { quality, hasFx } = this.qualityFormValue();
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
  /** Request-body upload progress (0..100) while `timingsUploadLoading` is true. */
  readonly timingsUploadPercent = signal(0);
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
  /** Sequence for quality-scoped track requests; guards against out-of-order responses. */
  private tracksRequestId = 0;

  constructor() {
    this.qualityForm.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.qualityFormValue.set({ quality: value.quality ?? undefined, hasFx: value.hasFx });
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
   * Work that pins the active quality: queued/uploading rows, or a validation round-trip
   * whose response would otherwise be applied against the newly selected quality.
   */
  private hasBlockingQualityWork(): boolean {
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
        this.loadQualitiesThenTracks();
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private recitationSlug(): string {
    return this.recitation()?.slug ?? this.slug;
  }

  /**
   * Opens the ayah timestamp editor for one track. The recitation slug and quality travel as
   * query params because the editor looks the track up through the recitation-scoped endpoint.
   */
  openTimestampEditor(track: RecitationSurahTrackListItem): void {
    void this.router.navigate(['/admin/audio/timestamps', track.id], {
      queryParams: {
        recitation: this.recitationSlug(),
        quality: this.selectedQualitySlug() ?? undefined,
      },
    });
  }

  private loadQualitiesThenTracks(): void {
    this.recitationsService.recitationQualitiesList(this.recitationSlug()).subscribe({
      next: (list) => {
        this.qualities.set(list);
        this.resolveSelectedQuality(this.route.snapshot.queryParamMap.get('quality'));
        this.loadTracksPage();
      },
      error: () => this.loadTracksPage(),
    });
  }

  private reloadQualitiesSilent(): void {
    this.recitationsService.recitationQualitiesList(this.recitationSlug()).subscribe({
      next: (list) => this.qualities.set(list),
    });
  }

  private refreshRecitationDetailSilent(): void {
    this.recitationsService.getDetail(this.recitationSlug()).subscribe({
      next: (data) => this.recitation.set(data),
    });
  }

  private resolveSelectedQuality(querySlug: string | null): void {
    const list = this.qualities();
    if (!list.length) {
      this.selectedQualitySlug.set(null);
      return;
    }
    const current = this.selectedQualitySlug();
    const currentQuality = current ? list.find((f) => f.slug === current) : undefined;
    if (currentQuality) {
      this.selectedQualitySlug.set(currentQuality.slug);
      return;
    }
    const fromQuery = querySlug ? list.find((f) => f.slug === querySlug) : undefined;
    const chosen = fromQuery ?? list.find((f) => f.is_default) ?? list[0];
    this.selectedQualitySlug.set(chosen.slug);
    this.writeQualityQueryParam(chosen.slug);
  }

  private writeQualityQueryParam(qualitySlug: string): void {
    if (this.route.snapshot.queryParamMap.get('quality') === qualitySlug) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { quality: qualitySlug },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  qualityLabel(quality: RecitationQualityOut): string {
    return qualityDisplayName(quality, this.translate.currentLang);
  }

  onQualitySelect(qualitySlug: string): void {
    const quality = this.qualities().find((f) => f.slug === qualitySlug);
    if (!quality || quality.slug === this.selectedQualitySlug()) return;
    if (!this.hasBlockingQualityWork()) {
      this.applyQualitySelection(quality);
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
            this.applyQualitySelection(quality);
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

  private applyQualitySelection(quality: RecitationQualityOut): void {
    this.selectedQualitySlug.set(quality.slug);
    this.writeQualityQueryParam(quality.slug);
    this.tracksPage.set(1);
    this.clearUploadSelection();
    this.clearTimingsSelection();
    this.clearTimingsUploadBanner();
    this.loadTracksPage();
  }

  openCreateQualityModal(): void {
    this.qualityFormMode.set('create');
    this.qualityFormTarget.set(null);
    this.qualityForm.reset({ quality: null, hasFx: false });
    this.qualityFormModalVisible.set(true);
  }

  /** Assigns or updates a quality's quality/effects variant. */
  openRenameQualityModal(quality: RecitationQualityOut): void {
    if (!canEditQualityVariant(quality)) return;
    const current = parseQualityVariant(quality);
    this.qualityFormMode.set('rename');
    this.qualityFormTarget.set(quality);
    this.qualityForm.reset({
      quality: current?.quality ?? null,
      hasFx: current?.hasFx ?? false,
    });
    this.qualityFormModalVisible.set(true);
  }

  onQualityFormVisibleChange(visible: boolean): void {
    this.qualityFormModalVisible.set(visible);
    if (!visible) {
      this.qualityFormTarget.set(null);
      this.qualityFormSubmitting.set(false);
    }
  }

  submitQualityForm(): boolean | Promise<boolean> {
    const variant = this.selectedVariant();
    if (this.qualityForm.invalid || !variant || this.selectedVariantTaken()) {
      this.qualityForm.markAllAsTouched();
      return false;
    }
    const recSlug = this.recitationSlug();
    const body = formatQualityVariantNames(variant);
    const mode = this.qualityFormMode();
    const target = this.qualityFormTarget();
    if (mode === 'rename' && !target) return false;
    this.qualityFormSubmitting.set(true);
    const req =
      mode === 'create'
        ? this.recitationsService.recitationQualityCreate(recSlug, body)
        : this.recitationsService.recitationQualityPatch(recSlug, target!.slug, body);

    return firstValueFrom(req)
      .then((quality) => {
        this.qualityFormModalVisible.set(false);
        this.message.success(
          this.translate.instant(
            mode === 'create'
              ? 'ADMIN.RECITATIONS.QUALITIES.MESSAGES.CREATE_OK'
              : 'ADMIN.RECITATIONS.QUALITIES.MESSAGES.RENAME_OK'
          )
        );
        return firstValueFrom(this.recitationsService.recitationQualitiesList(recSlug)).then(
          (list) => {
            this.qualities.set(list);
            if (mode === 'create') {
              const created = list.find((f) => f.slug === quality.slug) ?? quality;
              this.applyQualitySelection(created);
            }
            return true;
          }
        );
      })
      .catch((err: unknown) => {
        this.message.error(
          resolveApiErrorMessage(
            err,
            { fallbackKey: 'ADMIN.RECITATIONS.QUALITIES.MESSAGES.SAVE_ERROR' },
            this.translate
          )
        );
        throw err;
      })
      .finally(() => this.qualityFormSubmitting.set(false));
  }

  /**
   * Flips a quality's public visibility. Reachable only while
   * `environment.recitationQualityVisibility` is on, i.e. once the API accepts `is_visible`.
   */
  onToggleQualityVisibility(quality: RecitationQualityOut): void {
    if (!this.canToggleQualityVisibility() || quality.is_default) return;
    const nextVisible = !isQualityVisible(quality);
    firstValueFrom(
      this.recitationsService.recitationQualityPatch(this.recitationSlug(), quality.slug, {
        is_visible: nextVisible,
      })
    )
      .then((updated) => {
        this.qualities.update((list) =>
          list.map((f) => (f.slug === quality.slug ? { ...f, ...updated } : f))
        );
        this.message.success(
          this.translate.instant(
            nextVisible
              ? 'ADMIN.RECITATIONS.QUALITIES.MESSAGES.SHOWN_OK'
              : 'ADMIN.RECITATIONS.QUALITIES.MESSAGES.HIDDEN_OK'
          )
        );
      })
      .catch((err: unknown) => {
        this.message.error(
          resolveApiErrorMessage(
            err,
            { fallbackKey: 'ADMIN.RECITATIONS.QUALITIES.MESSAGES.SAVE_ERROR' },
            this.translate
          )
        );
      });
  }

  confirmSetDefaultQuality(quality: RecitationQualityOut): void {
    if (!this.canSetDefaultQuality() || quality.is_default) return;
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITATIONS.QUALITIES.SET_DEFAULT_CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITATIONS.QUALITIES.SET_DEFAULT_CONFIRM_BODY', {
        name: this.qualityLabel(quality),
      }),
      nzOkText: this.translate.instant('ADMIN.RECITATIONS.QUALITIES.SET_AS_DEFAULT'),
      nzOkType: 'primary',
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        firstValueFrom(
          this.recitationsService.recitationQualityPatch(this.recitationSlug(), quality.slug, {
            is_default: true,
          })
        )
          .then(() =>
            firstValueFrom(this.recitationsService.recitationQualitiesList(this.recitationSlug()))
          )
          .then((list) => {
            this.qualities.set(list);
            this.refreshRecitationDetailSilent();
            this.message.success(
              this.translate.instant('ADMIN.RECITATIONS.QUALITIES.MESSAGES.SET_DEFAULT_OK')
            );
          })
          .catch((err: unknown) => {
            this.message.error(
              resolveApiErrorMessage(
                err,
                { fallbackKey: 'ADMIN.RECITATIONS.QUALITIES.MESSAGES.SAVE_ERROR' },
                this.translate
              )
            );
            return false;
          }),
    });
  }

  confirmDeleteQuality(quality: RecitationQualityOut): void {
    if (quality.is_default) return;
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITATIONS.QUALITIES.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITATIONS.QUALITIES.DELETE.CONFIRM_BODY', {
        name: this.qualityLabel(quality),
        count: quality.tracks_count,
      }),
      nzOkText: this.translate.instant('ADMIN.RECITATIONS.QUALITIES.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        firstValueFrom(
          this.recitationsService.recitationQualityDelete(this.recitationSlug(), quality.slug)
        )
          .then(() =>
            firstValueFrom(this.recitationsService.recitationQualitiesList(this.recitationSlug()))
          )
          .then((list) => {
            this.sessionTimingDownloadByQualityId.update((map) => {
              const next = { ...map };
              delete next[quality.id];
              return next;
            });
            this.qualities.set(list);
            this.message.success(
              this.translate.instant('ADMIN.RECITATIONS.QUALITIES.MESSAGES.DELETE_OK')
            );
            const fallback = list.find((f) => f.is_default) ?? list[0];
            if (fallback) {
              this.applyQualitySelection(fallback);
            } else {
              this.selectedQualitySlug.set(null);
              this.tracksList.set([]);
              this.tracksTotal.set(0);
            }
          })
          .catch((err: unknown) => {
            this.message.error(
              resolveApiErrorMessage(
                err,
                { fallbackKey: 'ADMIN.RECITATIONS.QUALITIES.MESSAGES.DELETE_ERROR' },
                this.translate
              )
            );
            return false;
          }),
    });
  }

  loadTracksPage(): void {
    const rec = this.recitation();
    if (!rec) return;
    // Only the newest request may write the list, so a response for a quality or page
    // the user has already navigated away from is dropped instead of overwriting it.
    const requestId = ++this.tracksRequestId;
    this.tracksLoading.set(true);
    this.recitationsService
      .recitationTracksList({
        recitation_slug: rec.slug ?? this.slug,
        asset_id: rec.id,
        page: this.tracksPage(),
        page_size: this.tracksPageSize,
        quality: this.selectedQualitySlug() ?? undefined,
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
    this.timingsUploadPercent.set(0);
    this.timingsUploadResult.set(null);
    this.recitationsService
      .recitationTimingUpload(rec.id, files, this.selectedQuality()?.id, (fraction) =>
        this.timingsUploadPercent.set(Math.min(100, Math.floor(fraction * 100)))
      )
      .pipe(
        finalize(() => {
          this.timingsUploadLoading.set(false);
          this.timingsUploadPercent.set(0);
        })
      )
      .subscribe({
        next: (res: RecitationTimingUploadOut) => {
          this.timingsUploadResult.set(res);
          this.timingsFiles.set([]);
          const el = this.timingsFileInput()?.nativeElement;
          if (el) el.value = '';
          const qualityId = res.quality_id ?? this.selectedQuality()?.id;
          if (qualityId != null && res.synced_file_url) {
            this.sessionTimingDownloadByQualityId.update((map) => ({
              ...map,
              [qualityId]: res.synced_file_url as string,
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
        quality_id: this.selectedQuality()?.id,
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

    const qualityId = this.selectedQuality()?.id;

    this.validateLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.recitationsService.recitationTracksValidateUpload({
          asset_id: rec.id,
          filenames: candidates.map((r) => r.filename),
          quality_id: qualityId,
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
      qualityId
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
        this.reloadQualitiesSilent();
        this.loadTracksPage();
      }
    } finally {
      this.markBatchQueuedAsCancelled(batchFilenames);
    }
  }

  /** Applies the chosen "Files at a time" limit; the orchestrator validates and saves it. */
  onUploadConcurrencyChange(value: number): void {
    this.uploadOrchestrator.setFileConcurrency(value);
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

    const qualityId = this.selectedQuality()?.id;

    this.validateLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.recitationsService.recitationTracksValidateUpload({
          asset_id: rec.id,
          filenames: [fn],
          quality_id: qualityId,
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
      qualityId
    );
    this.trackUploadTask(task);
    void task.then(() => {
      const row = this.uploadRows().find((r) => r.filename === fn);
      if (row?.phase === 'success') {
        this.clearValidateUi();
        this.pruneActionableUploadRows();
      }
      this.reloadQualitiesSilent();
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
        new Promise<false | void>((resolve) => {
          this.recitationsService
            .recitationTracksDelete({ asset_id: rec.id, track_ids: [track.id] })
            .subscribe({
              next: () => {
                this.message.success(
                  this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.DELETE_OK')
                );
                this.reloadQualitiesSilent();
                this.loadTracksPage();
                resolve();
              },
              error: () => {
                this.message.error(
                  this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.DELETE_ERROR')
                );
                resolve(false);
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
