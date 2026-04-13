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

  async uploadAllFiles(
    assetId: number,
    files: { filename: string; blob: File }[],
    cbs: UploadOrchestratorCallbacks
  ): Promise<void> {
    const queue = [...files];
    const workers = Array.from({ length: RECITATION_TRACKS_FILE_CONCURRENCY }, () =>
      this.worker(assetId, queue, cbs)
    );
    await Promise.all(workers);
  }

  private async worker(
    assetId: number,
    queue: { filename: string; blob: File }[],
    cbs: UploadOrchestratorCallbacks
  ): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      try {
        await this.uploadOneFile(assetId, item, cbs);
      } catch (err) {
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
    cbs: UploadOrchestratorCallbacks
  ): Promise<void> {
    const { filename, blob } = file;
    cbs.onRowPatch(filename, { phase: 'uploading', progress: 0, uploadedBytes: 0 });

    const durationMs = await extractDurationMs(blob).catch(() => null);

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

        const etag = await putWithRetry(url, chunk, PUT_MAX_ATTEMPTS);
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
      await firstValueFrom(
        this.recitationsService.recitationTracksUploadAbort({ key, upload_id })
      ).catch(() => undefined);
      throw err;
    }
  }
}
