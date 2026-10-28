import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { from, of } from 'rxjs';
import {
  RECITATION_TRACKS_CHUNK_SIZE,
  RECITATION_TRACKS_CONCURRENCY_STORAGE_KEY,
  RecitationTracksUploadOrchestratorService,
} from './recitation-tracks-upload.orchestrator';
import { RecitationsService } from './recitations.service';

async function waitFor(cond: () => boolean, timeoutMs = 2000): Promise<void> {
  const startedAt = Date.now();
  while (!cond()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe('RecitationTracksUploadOrchestratorService', () => {
  let service: RecitationTracksUploadOrchestratorService;
  /** Pending `upload/start` calls; resolving one lets that file proceed and finish. */
  let pendingStarts: { filename: string; release: () => void }[];
  let startedFilenames: string[];
  let activeFiles: number;
  let maxActiveFiles: number;

  const file = (name: string): { filename: string; blob: File } => ({
    filename: name,
    blob: new File([new Uint8Array(16)], name, { type: 'audio/mpeg' }),
  });
  const cbs = { onRowPatch: jasmine.createSpy('onRowPatch') };

  function setup(stored: string | null): void {
    localStorage.removeItem(RECITATION_TRACKS_CONCURRENCY_STORAGE_KEY);
    if (stored !== null) localStorage.setItem(RECITATION_TRACKS_CONCURRENCY_STORAGE_KEY, stored);

    pendingStarts = [];
    startedFilenames = [];
    activeFiles = 0;
    maxActiveFiles = 0;

    const recitationsService = {
      recitationTracksUploadStart: (body: { filename: string }) =>
        from(
          new Promise<{ key: string; upload_id: string; surah_number: number }>((resolve) => {
            startedFilenames.push(body.filename);
            activeFiles++;
            maxActiveFiles = Math.max(maxActiveFiles, activeFiles);
            pendingStarts.push({
              filename: body.filename,
              release: () =>
                resolve({ key: `k-${body.filename}`, upload_id: 'u', surah_number: 1 }),
            });
          })
        ),
      recitationTracksUploadSignPart: () => of({ url: 'https://r2.test/part' }),
      recitationTracksUploadFinish: () => {
        activeFiles--;
        return of({ track_id: 1, surah_number: 1 });
      },
      recitationTracksUploadAbort: () => of({}),
    };

    TestBed.configureTestingModule({
      providers: [
        RecitationTracksUploadOrchestratorService,
        { provide: RecitationsService, useValue: recitationsService },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
      ],
    });
    service = TestBed.inject(RecitationTracksUploadOrchestratorService);
  }

  beforeEach(() => {
    spyOn(window, 'fetch').and.callFake(() =>
      Promise.resolve(new Response(null, { status: 200, headers: { ETag: '"etag"' } }))
    );
  });

  afterEach(() => {
    localStorage.removeItem(RECITATION_TRACKS_CONCURRENCY_STORAGE_KEY);
  });

  it('uploads in 8 MB parts', () => {
    expect(RECITATION_TRACKS_CHUNK_SIZE).toBe(8 * 1024 * 1024);
  });

  it('defaults to one file at a time', () => {
    setup(null);
    expect(service.fileConcurrency()).toBe(1);
  });

  it('restores a saved concurrency and ignores an invalid one', () => {
    setup('3');
    expect(service.fileConcurrency()).toBe(3);
    TestBed.resetTestingModule();
    setup('99');
    expect(service.fileConcurrency()).toBe(1);
  });

  it('saves the chosen concurrency and rejects values outside the options', () => {
    setup(null);
    service.setFileConcurrency(4);
    expect(service.fileConcurrency()).toBe(4);
    expect(localStorage.getItem(RECITATION_TRACKS_CONCURRENCY_STORAGE_KEY)).toBe('4');
    service.setFileConcurrency(7);
    expect(service.fileConcurrency()).toBe(4);
  });

  it('keeps the limit across separate batches and single-file retries', async () => {
    setup(null);
    const batch = service.uploadAllFiles(1, [file('001.mp3'), file('002.mp3')], cbs);
    const retry = service.uploadAllFiles(1, [file('003.mp3')], cbs);

    await waitFor(() => pendingStarts.length === 1);
    pendingStarts.shift()?.release();
    await waitFor(() => pendingStarts.length === 1);
    pendingStarts.shift()?.release();
    await waitFor(() => pendingStarts.length === 1);
    pendingStarts.shift()?.release();
    await Promise.all([batch, retry]);

    expect(maxActiveFiles).toBe(1);
    expect(startedFilenames).toEqual(['001.mp3', '002.mp3', '003.mp3']);
  });

  it('starts more queued files when the limit is raised mid-run', async () => {
    setup(null);
    const run = service.uploadAllFiles(1, [file('001.mp3'), file('002.mp3'), file('003.mp3')], cbs);
    await waitFor(() => pendingStarts.length === 1);

    service.setFileConcurrency(3);
    await waitFor(() => pendingStarts.length === 3);
    pendingStarts.splice(0).forEach((p) => p.release());
    await run;

    expect(maxActiveFiles).toBe(3);
  });

  it('settles queued files when all uploads are aborted', async () => {
    setup(null);
    const run = service.uploadAllFiles(1, [file('001.mp3'), file('002.mp3')], cbs);
    await waitFor(() => pendingStarts.length === 1);

    service.abortCurrentUploadRun();
    pendingStarts.shift()?.release();
    await run;

    expect(startedFilenames).toEqual(['001.mp3']);
  });
});
