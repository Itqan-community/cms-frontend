import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  readonly uploadRunning = signal(false);

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

  private slug!: string;

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
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
    this.uploadRunning.set(false);
  }

  private runValidate(): void {
    const rec = this.recitation();
    if (!rec) return;
    const rows = this.uploadRows();
    if (!rows.length) return;

    this.validateLoading.set(true);
    this.recitationsService
      .recitationTracksValidateUpload({
        asset_id: rec.id,
        filenames: rows.map((r) => r.filename),
      })
      .subscribe({
        next: (res) => {
          this.validateMessage.set(res.message);
          this.validateTopStatus.set(res.status);

          const byName = new Map(res.files.map((f) => [f.filename, f.status]));
          this.uploadRows.update((prev) =>
            prev.map((row) => {
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

  async startUpload(): Promise<void> {
    const rec = this.recitation();
    if (!rec || this.validateTopStatus() !== 'valid' || this.uploadRunning()) return;

    const toUpload = this.uploadRows().filter(
      (r) => r.validateStatus === 'valid' && r.phase === 'ready'
    );
    if (!toUpload.length) return;

    this.uploadRunning.set(true);
    toUpload.forEach((r) => {
      this.patchUploadRow(r.filename, { phase: 'queued', progress: 0 });
    });

    try {
      await this.uploadOrchestrator.uploadAllFiles(
        rec.id,
        toUpload.map((r) => ({ filename: r.filename, blob: r.file })),
        {
          onRowPatch: (filename, patch) => {
            this.patchUploadRow(filename, patch);
          },
        }
      );

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
      this.uploadRunning.set(false);
    }
  }

  retryUploadRow(row: RecitationTrackUploadRowState): void {
    const rec = this.recitation();
    if (!rec || this.uploadRunning() || row.validateStatus !== 'valid') return;
    this.uploadRunning.set(true);
    this.patchUploadRow(row.filename, { phase: 'queued', progress: 0, errorMessage: undefined });
    void this.uploadOrchestrator
      .uploadAllFiles(rec.id, [{ filename: row.filename, blob: row.file }], {
        onRowPatch: (filename, patch) => {
          this.patchUploadRow(filename, patch);
        },
      })
      .then(() => this.loadTracksPage())
      .finally(() => this.uploadRunning.set(false));
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
