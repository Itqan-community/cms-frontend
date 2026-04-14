import { DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import type {
  RecitationSurahTrackListItem,
  RecitationTrackUploadRowState,
  RecitationTrackValidateFileStatus,
  RecitationTrackValidateUploadOut,
} from '../../models/recitation-tracks.models';
import { MaddLevel, MeemBehavior, RecitationDetails } from '../../models/recitations.models';
import { RecitationTracksUploadOrchestratorService } from '../../services/recitation-tracks-upload.orchestrator';
import { RecitationsService } from '../../services/recitations.service';

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
    NzPaginationModule,
    NzProgressModule,
    NzAlertModule,
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

  readonly recitation = signal<RecitationDetails | null>(null);
  readonly loading = signal(true);
  readonly licensesColors = LicensesColors;
  readonly maddLevel = MaddLevel;
  readonly meemBehavior = MeemBehavior;

  readonly tracksList = signal<RecitationSurahTrackListItem[]>([]);
  readonly tracksTotal = signal(0);
  readonly tracksLoading = signal(false);
  readonly tracksPage = signal(1);
  readonly tracksPageSize = TRACKS_PAGE_SIZE;

  readonly uploadRows = signal<RecitationTrackUploadRowState[]>([]);
  readonly validateMessage = signal<string | null>(null);
  readonly validateTopStatus = signal<'idle' | 'valid' | 'invalid'>('idle');
  readonly validateLoading = signal(false);

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
        this.loadTracksPage();
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadTracksPage(): void {
    const rec = this.recitation();
    if (!rec) return;
    this.tracksLoading.set(true);
    this.recitationsService
      .recitationTracksList({
        asset_id: rec.id,
        page: this.tracksPage(),
        page_size: this.tracksPageSize,
      })
      .subscribe({
        next: (res) => {
          this.tracksList.set(res.results);
          this.tracksTotal.set(res.count);
          this.tracksLoading.set(false);
        },
        error: () => this.tracksLoading.set(false),
      });
  }

  onTracksPageChange(page: number): void {
    this.tracksPage.set(page);
    this.loadTracksPage();
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
    this.validateMessage.set(null);
    this.validateTopStatus.set('idle');
    this.runValidate();
    input.value = '';
  }

  clearUploadSelection(): void {
    this.uploadRows.set([]);
    this.validateMessage.set(null);
    this.validateTopStatus.set('idle');
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
      this.validateMessage.set(null);
      this.validateTopStatus.set('idle');
      return;
    }
    this.runValidate();
  }

  /** After user confirms a mixed batch upload: drop invalid/skip rows and hide the validate alert. */
  private removeInvalidAndSkippedUploadRowsAndClearValidateUi(): void {
    this.uploadRows.update((rows) =>
      rows.filter((r) => r.validateStatus !== 'invalid' && r.validateStatus !== 'skip')
    );
    this.validateMessage.set(null);
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

    this.validateLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.recitationsService.recitationTracksValidateUpload({
          asset_id: rec.id,
          filenames: candidates.map((r) => r.filename),
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
      }
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
      } else {
        this.message.warning(
          this.translate.instant('ADMIN.RECITATIONS.TRACKS.MESSAGES.UPLOAD_PARTIAL', {
            ok,
            failed,
          })
        );
      }
      this.loadTracksPage();
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

    this.validateLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.recitationsService.recitationTracksValidateUpload({
          asset_id: rec.id,
          filenames: [fn],
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
      }
    );
    this.trackUploadTask(task);
    void task.then(() => this.loadTracksPage());
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

  maddLabel(level: MaddLevel): string {
    return level === MaddLevel.TWASSUT
      ? this.translate.instant('ADMIN.RECITATIONS.FILTERS.MADD_TWASSUT')
      : this.translate.instant('ADMIN.RECITATIONS.FILTERS.MADD_QASR');
  }

  meemLabel(b: MeemBehavior): string {
    return b === MeemBehavior.SILAH
      ? this.translate.instant('ADMIN.RECITATIONS.FORM.MEEM_WASL_LONG')
      : this.translate.instant('ADMIN.RECITATIONS.FILTERS.MEEM_SKOUN');
  }

  formatDurationMs(ms: number | null | undefined): string {
    if (ms == null || ms <= 0) return '—';
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  formatBytes(n: number | null | undefined): string {
    if (n == null || n <= 0) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }
}
