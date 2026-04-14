import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  RecitationTrackUploadFinishPart,
  RecitationTrackUploadRowState,
} from '../models/recitation-tracks.models';
import { RecitationsService } from './recitations.service';

export const RECITATION_TRACKS_CHUNK_SIZE = 32 * 1024 * 1024;
export const RECITATION_TRACKS_FILE_CONCURRENCY = 4;
const PUT_MAX_ATTEMPTS = 3;

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
 * preserving retry/backoff, abort/signal behavior, and parity with this function’s success criteria
 * (HTTP ok + ETag header).
 */
async function putWithRetry(url: string, chunk: Blob, maxAttempts: number): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method: 'PUT', body: chunk });
      if (!res.ok) throw new Error(`R2 responded ${res.status}`);
      const etag = res.headers.get('ETag');
      if (!etag) throw new Error('Missing ETag in R2 response');
      return etag;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await sleep(500 * Math.pow(2, attempt - 1));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

@Injectable({ providedIn: 'root' })
export class RecitationTracksUploadOrchestratorService {
  private readonly recitationsService = inject(RecitationsService);
  /** Multiple batches can run concurrently; a new batch does not cancel previous ones. */
  private readonly activeRunControllers = new Set<AbortController>();
  /** Per currently uploading file — allows cancelling one upload without aborting the whole run. */
  private readonly fileAbortControllers = new Map<string, AbortController>();
  /** Ensures only one logical upload runs per filename at a time (avoids orphaned runs finishing after abort / double-finish). */
  private readonly perFileUploadChain = new Map<string, Promise<void>>();

  /** Aborts every in-flight batch (all workers + PUTs). */
  abortCurrentUploadRun(): void {
    for (const ac of this.activeRunControllers) {
      ac.abort();
    }
  }

  /** Stops only this file’s in-flight PUTs; other concurrent uploads in the same run continue. */
  abortSingleFileUpload(filename: string): void {
    this.fileAbortControllers.get(filename)?.abort();
  }

  async uploadAllFiles(
    assetId: number,
    files: { filename: string; blob: File }[],
    cbs: UploadOrchestratorCallbacks
  ): Promise<void> {
    const ac = new AbortController();
    this.activeRunControllers.add(ac);
    const signal = ac.signal;

    try {
      const queue = [...files];
      const workers = Array.from({ length: RECITATION_TRACKS_FILE_CONCURRENCY }, () =>
        this.worker(assetId, queue, cbs, signal)
      );
      await Promise.all(workers);
    } finally {
      this.activeRunControllers.delete(ac);
    }
  }

  private async worker(
    assetId: number,
    queue: { filename: string; blob: File }[],
    cbs: UploadOrchestratorCallbacks,
    signal: AbortSignal
  ): Promise<void> {
    while (queue.length > 0) {
      if (signal.aborted) return;
      const item = queue.shift();
      if (!item) return;
      try {
        await this.uploadOneFile(assetId, item, cbs, signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          continue;
        }
        const msg = err instanceof Error ? err.message : String(err);
        cbs.onRowPatch(item.filename, {
          phase: 'failed',
          errorMessage: msg,
          progress: 0,
        });
      }
    }
  }

  private async uploadOneFile(
    assetId: number,
    file: { filename: string; blob: File },
    cbs: UploadOrchestratorCallbacks,
    globalSignal: AbortSignal
  ): Promise<void> {
    const { filename } = file;
    const previous = this.perFileUploadChain.get(filename);
    const run = (async (): Promise<void> => {
      if (previous) await previous.catch(() => undefined);
      await this.runSingleFileUpload(assetId, file, cbs, globalSignal);
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
    globalSignal: AbortSignal
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
          filename,
          duration_ms: durationMs,
          size_bytes: blob.size,
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
            filename,
            key,
            upload_id,
            parts,
            duration_ms: durationMs,
            size_bytes: blob.size,
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
}
