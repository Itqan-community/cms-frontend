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
  private runAbort: AbortController | null = null;

  /** Cancels in-flight R2 PUTs and stops workers (per-file BE abort still runs where applicable). */
  abortCurrentUploadRun(): void {
    this.runAbort?.abort();
  }

  async uploadAllFiles(
    assetId: number,
    files: { filename: string; blob: File }[],
    cbs: UploadOrchestratorCallbacks
  ): Promise<void> {
    this.runAbort?.abort();
    const ac = new AbortController();
    this.runAbort = ac;
    const signal = ac.signal;

    try {
      const queue = [...files];
      const workers = Array.from({ length: RECITATION_TRACKS_FILE_CONCURRENCY }, () =>
        this.worker(assetId, queue, cbs, signal)
      );
      await Promise.all(workers);
    } finally {
      if (this.runAbort === ac) {
        this.runAbort = null;
      }
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
    signal: AbortSignal
  ): Promise<void> {
    const { filename, blob } = file;

    if (signal.aborted) {
      cbs.onRowPatch(filename, { phase: 'cancelled', progress: 0 });
      return;
    }

    cbs.onRowPatch(filename, { phase: 'uploading', progress: 0, uploadedBytes: 0 });

    const durationMs = await extractDurationMs(blob).catch(() => null);

    if (signal.aborted) {
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
    cbs.onRowPatch(filename, { surahNumber: start.surah_number });

    try {
      const parts: RecitationTrackUploadFinishPart[] = [];
      const totalParts = Math.max(1, Math.ceil(blob.size / RECITATION_TRACKS_CHUNK_SIZE));

      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        if (signal.aborted) {
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
          return put(url, chunk, PUT_MAX_ATTEMPTS, signal);
        })();
        parts.push({ ETag: etag, PartNumber: partNumber });

        const uploadedBytes = end;
        cbs.onRowPatch(filename, {
          progress: uploadedBytes / blob.size,
          uploadedBytes,
          totalBytes: blob.size,
        });
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
        return;
      }
      await firstValueFrom(
        this.recitationsService.recitationTracksUploadAbort({ key, upload_id })
      ).catch(() => undefined);
      throw err;
    }
  }
}
