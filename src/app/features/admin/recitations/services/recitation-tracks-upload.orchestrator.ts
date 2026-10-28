import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import type {
  RecitationTrackUploadFinishPart,
  RecitationTrackUploadRowState,
} from '../models/recitation-tracks.models';
import { RecitationsService } from './recitations.service';

export const RECITATION_TRACKS_CHUNK_SIZE = 8 * 1024 * 1024;
/** How many files may upload at once; the user picks one, remembered per browser. */
export const RECITATION_TRACKS_CONCURRENCY_OPTIONS: readonly number[] = [1, 2, 3, 4];
export const RECITATION_TRACKS_CONCURRENCY_STORAGE_KEY = 'cms.recitationTracksUploadConcurrency';
/** One at a time by default so slow connections are not split across several files. */
const DEFAULT_FILE_CONCURRENCY = 1;
const PUT_MAX_ATTEMPTS = 3;

interface QueuedFileUpload {
  assetId: number;
  file: { filename: string; blob: File };
  cbs: UploadOrchestratorCallbacks;
  signal: AbortSignal;
  folderId?: number | null;
  done: () => void;
}

function readStoredConcurrency(): number {
  try {
    const stored = Number(localStorage.getItem(RECITATION_TRACKS_CONCURRENCY_STORAGE_KEY));
    return RECITATION_TRACKS_CONCURRENCY_OPTIONS.includes(stored)
      ? stored
      : DEFAULT_FILE_CONCURRENCY;
  } catch {
    return DEFAULT_FILE_CONCURRENCY;
  }
}

export interface UploadOrchestratorCallbacks {
  onRowPatch: (filename: string, patch: Partial<RecitationTrackUploadRowState>) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Aborts when either parent signal aborts; call `cleanup` when the merged listener is no longer needed. */
function mergeAbortSignals(
  a: AbortSignal,
  b: AbortSignal
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const abortMerged = (): void => {
    controller.abort();
  };
  if (a.aborted || b.aborted) {
    abortMerged();
    return { signal: controller.signal, cleanup: () => undefined };
  }
  a.addEventListener('abort', abortMerged);
  b.addEventListener('abort', abortMerged);
  return {
    signal: controller.signal,
    cleanup: () => {
      a.removeEventListener('abort', abortMerged);
      b.removeEventListener('abort', abortMerged);
    },
  };
}

export async function extractDurationMs(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = 'metadata';
    const cleanup = (): void => {
      URL.revokeObjectURL(url);
    };
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      cleanup();
      if (!Number.isFinite(d) || d <= 0) resolve(null);
      else resolve(Math.round(d * 1000));
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    audio.src = url;
  });
}

/**
 * Upload progress note (optional follow-up, do not mix with core UX until stable):
 * `fetch()` does not expose upload byte progress. For real per-chunk progress, implement an
 * isolated path using `XMLHttpRequest` + `xhr.upload.onprogress` for each presigned PUT, while
 * preserving retry/backoff, abort/signal behavior, and parity with inline PUT success criteria
 * (HTTP ok + ETag header).
 */

@Injectable({ providedIn: 'root' })
export class RecitationTracksUploadOrchestratorService {
  private readonly recitationsService = inject(RecitationsService);
  private readonly translate = inject(TranslateService);
  /** Multiple batches can run concurrently; a new batch does not cancel previous ones. */
  private readonly activeRunControllers = new Set<AbortController>();
  /** Per currently uploading file — allows cancelling one upload without aborting the whole run. */
  private readonly fileAbortControllers = new Map<string, AbortController>();
  /** Ensures only one logical upload runs per filename at a time (avoids orphaned runs finishing after abort / double-finish). */
  private readonly perFileUploadChain = new Map<string, Promise<void>>();
  /** Files waiting for a slot, shared by every batch and retry so the limit holds page-wide. */
  private readonly pendingUploads: QueuedFileUpload[] = [];
  private activeUploadCount = 0;

  readonly fileConcurrency = signal(readStoredConcurrency());

  /** Raising the limit starts queued files now; lowering it lets in-flight files finish. */
  setFileConcurrency(value: number): void {
    if (!RECITATION_TRACKS_CONCURRENCY_OPTIONS.includes(value)) return;
    this.fileConcurrency.set(value);
    try {
      localStorage.setItem(RECITATION_TRACKS_CONCURRENCY_STORAGE_KEY, String(value));
    } catch {
      // Storage unavailable (private mode / blocked): the choice lasts for this page only.
    }
    this.startQueuedUploads();
  }

  /** Aborts every in-flight batch (all queued files + PUTs). */
  abortCurrentUploadRun(): void {
    for (const ac of this.activeRunControllers) {
      ac.abort();
    }
    for (const job of this.pendingUploads.splice(0)) {
      job.done();
    }
  }

  /** Stops only this file’s in-flight PUTs; other concurrent uploads in the same run continue. */
  abortSingleFileUpload(filename: string): void {
    this.fileAbortControllers.get(filename)?.abort();
  }

  async uploadAllFiles(
    assetId: number,
    files: { filename: string; blob: File }[],
    cbs: UploadOrchestratorCallbacks,
    folderId?: number | null
  ): Promise<void> {
    const ac = new AbortController();
    this.activeRunControllers.add(ac);
    const signal = ac.signal;

    try {
      const finished = files.map(
        (file) =>
          new Promise<void>((done) => {
            this.pendingUploads.push({ assetId, file, cbs, signal, folderId, done });
          })
      );
      this.startQueuedUploads();
      await Promise.all(finished);
    } finally {
      this.activeRunControllers.delete(ac);
    }
  }

  private startQueuedUploads(): void {
    while (this.activeUploadCount < this.fileConcurrency()) {
      const job = this.pendingUploads.shift();
      if (!job) return;
      if (job.signal.aborted) {
        job.done();
        continue;
      }
      this.activeUploadCount++;
      void this.runQueuedUpload(job).finally(() => {
        this.activeUploadCount--;
        job.done();
        this.startQueuedUploads();
      });
    }
  }

  private async runQueuedUpload(job: QueuedFileUpload): Promise<void> {
    const { assetId, file, cbs, signal, folderId } = job;
    try {
      await this.uploadOneFile(assetId, file, cbs, signal, folderId);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      cbs.onRowPatch(file.filename, {
        phase: 'failed',
        errorMessage: this.formatUploadError(err),
        progress: 0,
      });
    }
  }

  private async uploadOneFile(
    assetId: number,
    file: { filename: string; blob: File },
    cbs: UploadOrchestratorCallbacks,
    globalSignal: AbortSignal,
    folderId?: number | null
  ): Promise<void> {
    const { filename } = file;
    const previous = this.perFileUploadChain.get(filename);
    const run = (async (): Promise<void> => {
      if (previous) await previous.catch(() => undefined);
      await this.runSingleFileUpload(assetId, file, cbs, globalSignal, folderId);
    })();
    this.perFileUploadChain.set(filename, run);
    try {
      await run;
    } finally {
      if (this.perFileUploadChain.get(filename) === run) {
        this.perFileUploadChain.delete(filename);
      }
    }
  }

  private async runSingleFileUpload(
    assetId: number,
    file: { filename: string; blob: File },
    cbs: UploadOrchestratorCallbacks,
    globalSignal: AbortSignal,
    folderId?: number | null
  ): Promise<void> {
    const { filename, blob } = file;

    const fileAc = new AbortController();
    this.fileAbortControllers.set(filename, fileAc);
    const { signal: mergedSignal, cleanup: cleanupMerged } = mergeAbortSignals(
      globalSignal,
      fileAc.signal
    );

    let keyForAbort: string | undefined;
    let uploadIdForAbort: string | undefined;

    try {
      if (mergedSignal.aborted) {
        cbs.onRowPatch(filename, { phase: 'cancelled', progress: 0 });
        return;
      }

      cbs.onRowPatch(filename, { phase: 'uploading', progress: 0, uploadedBytes: 0 });

      const durationMs = await extractDurationMs(blob).catch(() => null);

      if (mergedSignal.aborted) {
        cbs.onRowPatch(filename, { phase: 'cancelled', progress: 0 });
        return;
      }

      const start = await firstValueFrom(
        this.recitationsService.recitationTracksUploadStart({
          asset_id: assetId,
          folder_id: folderId,
          filename,
          duration_ms: durationMs,
          size_bytes: blob.size,
          ...(folderId != null ? { folder_id: folderId } : {}),
        })
      );

      const { key, upload_id } = start;
      keyForAbort = key;
      uploadIdForAbort = upload_id;
      cbs.onRowPatch(filename, { surahNumber: start.surah_number });

      if (mergedSignal.aborted) {
        await firstValueFrom(
          this.recitationsService.recitationTracksUploadAbort({ key, upload_id })
        ).catch(() => undefined);
        cbs.onRowPatch(filename, { phase: 'cancelled', progress: 0, uploadedBytes: 0 });
        return;
      }

      try {
        const parts: RecitationTrackUploadFinishPart[] = [];
        const totalParts = Math.max(1, Math.ceil(blob.size / RECITATION_TRACKS_CHUNK_SIZE));

        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
          if (mergedSignal.aborted) {
            await firstValueFrom(
              this.recitationsService.recitationTracksUploadAbort({ key, upload_id })
            ).catch(() => undefined);
            cbs.onRowPatch(filename, { phase: 'cancelled', progress: 0 });
            throw new DOMException('Upload cancelled', 'AbortError');
          }

          const startByte = (partNumber - 1) * RECITATION_TRACKS_CHUNK_SIZE;
          const end = Math.min(startByte + RECITATION_TRACKS_CHUNK_SIZE, blob.size);
          const chunk = blob.slice(startByte, end);

          const { url } = await firstValueFrom(
            this.recitationsService.recitationTracksUploadSignPart({
              key,
              upload_id,
              part_number: partNumber,
            })
          );

          if (mergedSignal.aborted) {
            await firstValueFrom(
              this.recitationsService.recitationTracksUploadAbort({ key, upload_id })
            ).catch(() => undefined);
            cbs.onRowPatch(filename, { phase: 'cancelled', progress: 0, uploadedBytes: 0 });
            throw new DOMException('Upload cancelled', 'AbortError');
          }

          const etag = await (async () => {
            // Inline wrapper so we can pass AbortSignal without changing public signature elsewhere.
            const put = async (
              u: string,
              c: Blob,
              max: number,
              s: AbortSignal
            ): Promise<string> => {
              let lastErr: unknown;
              for (let attempt = 1; attempt <= max; attempt++) {
                if (s.aborted) throw new DOMException('Upload cancelled', 'AbortError');
                try {
                  const res = await fetch(u, { method: 'PUT', body: c, signal: s });
                  if (!res.ok) throw new Error(`R2 responded ${res.status}`);
                  const tag = res.headers.get('ETag');
                  if (!tag) throw new Error('Missing ETag in R2 response');
                  return tag;
                } catch (e) {
                  if (e instanceof DOMException && e.name === 'AbortError') throw e;
                  lastErr = e;
                  if (attempt < max && !s.aborted) {
                    await sleep(500 * Math.pow(2, attempt - 1));
                  }
                }
              }
              throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
            };
            return put(url, chunk, PUT_MAX_ATTEMPTS, mergedSignal);
          })();
          parts.push({ ETag: etag, PartNumber: partNumber });

          const uploadedBytes = end;
          cbs.onRowPatch(filename, {
            progress: uploadedBytes / blob.size,
            uploadedBytes,
            totalBytes: blob.size,
          });
        }

        if (mergedSignal.aborted) {
          await firstValueFrom(
            this.recitationsService.recitationTracksUploadAbort({ key, upload_id })
          ).catch(() => undefined);
          cbs.onRowPatch(filename, { phase: 'cancelled', progress: 0, uploadedBytes: 0 });
          throw new DOMException('Upload cancelled', 'AbortError');
        }

        const finish = await firstValueFrom(
          this.recitationsService.recitationTracksUploadFinish({
            asset_id: assetId,
            folder_id: folderId,
            filename,
            key,
            upload_id,
            parts,
            duration_ms: durationMs,
            size_bytes: blob.size,
            ...(folderId != null ? { folder_id: folderId } : {}),
          })
        );

        cbs.onRowPatch(filename, {
          phase: 'success',
          progress: 1,
          uploadedBytes: blob.size,
          totalBytes: blob.size,
          trackId: finish.track_id,
          surahNumber: finish.surah_number,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (keyForAbort && uploadIdForAbort) {
            await firstValueFrom(
              this.recitationsService.recitationTracksUploadAbort({
                key: keyForAbort,
                upload_id: uploadIdForAbort,
              })
            ).catch(() => undefined);
          }
          cbs.onRowPatch(filename, {
            phase: 'cancelled',
            progress: 0,
            uploadedBytes: 0,
          });
          return;
        }
        await firstValueFrom(
          this.recitationsService.recitationTracksUploadAbort({ key, upload_id })
        ).catch(() => undefined);
        throw err;
      }
    } finally {
      cleanupMerged();
      if (this.fileAbortControllers.get(filename) === fileAc) {
        this.fileAbortControllers.delete(filename);
      }
    }
  }

  private formatUploadError(err: unknown): string {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.UPLOAD_ERRORS.CANCELLED');
    }
    const msg = err instanceof Error ? err.message : String(err);
    const r2Match = /^R2 responded (\d+)$/.exec(msg);
    if (r2Match) {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.UPLOAD_ERRORS.R2_RESPONSE', {
        status: r2Match[1],
      });
    }
    if (msg === 'Missing ETag in R2 response') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.UPLOAD_ERRORS.MISSING_ETAG');
    }
    if (msg === 'Upload cancelled') {
      return this.translate.instant('ADMIN.RECITATIONS.TRACKS.UPLOAD_ERRORS.CANCELLED');
    }
    return this.translate.instant('ADMIN.RECITATIONS.TRACKS.UPLOAD_ERRORS.GENERIC');
  }
}
