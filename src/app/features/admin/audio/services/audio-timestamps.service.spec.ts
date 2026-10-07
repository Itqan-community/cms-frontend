import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RecitationTimingUploadOut } from '../../recitations/models/recitation-timings.models';
import type { TrackTimestamps } from '../models/audio-timestamps.models';
import {
  AudioTimestampsService,
  TimingUploadRejectedError,
  type TimestampTrackRef,
} from './audio-timestamps.service';

const TIMINGS_URL = 'https://cdn.example.com/recitations/sample/001.json';

const TRACK: TimestampTrackRef = {
  id: 12,
  surah_number: 1,
  filename: '001.mp3',
  available_ayah_timings_url: TIMINGS_URL,
};

const TIMESTAMPS: TrackTimestamps = {
  track_id: 12,
  surah_number: 1,
  surah: { start_ms: 0, end_ms: 29_000 },
  ayahs: [
    { ayah: 1, start_ms: 0, end_ms: 9_000 },
    { ayah: 2, start_ms: 10_000, end_ms: 19_000 },
  ],
};

function uploadResult(patch: Partial<RecitationTimingUploadOut> = {}): RecitationTimingUploadOut {
  return {
    asset_id: 7,
    created_total: 0,
    updated_total: 1,
    skipped_total: 0,
    missing_tracks: [],
    file_errors: [],
    synced_file_url: TIMINGS_URL,
    synced_filename: '001.json',
    ...patch,
  };
}

describe('AudioTimestampsService', () => {
  let service: AudioTimestampsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AudioTimestampsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('load', () => {
    it('reads the track’s own timing file rather than an API endpoint', (done) => {
      service.load(TRACK).subscribe((loaded) => {
        expect(loaded).toEqual(TIMESTAMPS);
        done();
      });

      const req = httpMock.expectOne(TIMINGS_URL);
      expect(req.request.method).toBe('GET');
      req.flush({
        surah_number: 1,
        surah: { start_ms: 0, end_ms: 29_000 },
        ayahs: TIMESTAMPS.ayahs,
      });
    });

    it('treats a track with no timing file as an empty editor, with no request', (done) => {
      service.load({ ...TRACK, available_ayah_timings_url: null }).subscribe((loaded) => {
        expect(loaded).toEqual({ track_id: 12, surah_number: 1, surah: null, ayahs: [] });
        done();
      });
    });

    it('narrows a recitation-wide file to this track’s surah', (done) => {
      service.load({ ...TRACK, surah_number: 2 }).subscribe((loaded) => {
        expect(loaded.surah_number).toBe(2);
        expect(loaded.ayahs).toEqual([{ ayah: 1, start_ms: 500, end_ms: 4_000 }]);
        done();
      });

      httpMock.expectOne(TIMINGS_URL).flush({
        '1': { ayahs: [{ ayah: 1, start_ms: 0, end_ms: 9_000 }] },
        '2': { ayahs: [{ ayah: 1, start_ms: 500, end_ms: 4_000 }] },
      });
    });

    it('sorts ayahs and drops entries with no ayah number', (done) => {
      service.load(TRACK).subscribe((loaded) => {
        expect(loaded.ayahs.map((a) => a.ayah)).toEqual([1, 2]);
        done();
      });

      httpMock.expectOne(TIMINGS_URL).flush({
        ayahs: [
          { ayah: 2, start_ms: 10_000, end_ms: 19_000 },
          { start_ms: 0, end_ms: 100 },
          { ayah: 1, start_ms: 0, end_ms: 9_000 },
        ],
      });
    });
  });

  describe('save', () => {
    it('uploads the boundaries as a timing file through the timing ingest', (done) => {
      service
        .save({ assetId: 7, folderId: 9, track: TRACK, timestamps: TIMESTAMPS })
        .subscribe((out) => {
          expect(out.updated_total).toBe(1);
          done();
        });

      const req = httpMock.expectOne((r) => r.url.includes('/portal/timing/upload/'));
      expect(req.request.method).toBe('POST');

      const body = req.request.body as FormData;
      expect(body.get('asset_id')).toBe('7');
      expect(body.get('folder_id')).toBe('9');

      // The ingest pairs a file with a track by the surah in its name, so the audio file's
      // own stem is what travels — a mismatch here is reported as an unmatched surah.
      const file = body.get('files') as File;
      expect(file.name).toBe('001.json');
      expect(file.type).toBe('application/json');

      req.flush(uploadResult());
    });

    it('names the file after the surah when the track has no filename', () => {
      service
        .save({ assetId: 7, track: { ...TRACK, filename: null }, timestamps: TIMESTAMPS })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/portal/timing/upload/'));
      const body = req.request.body as FormData;
      expect(body.get('folder_id')).toBeNull();
      expect((body.get('files') as File).name).toBe('001.json');

      req.flush(uploadResult());
    });

    it('writes the key names the ingest requires', (done) => {
      // Every one of these was established by a rejection rather than a schema: `Missing surah_id
      // in uploaded JSON`, then a bare `'ayah_number'` KeyError, then a bare `'start'`.
      service.save({ assetId: 7, track: TRACK, timestamps: TIMESTAMPS }).subscribe(() => done());

      const req = httpMock.expectOne((r) => r.url.includes('/portal/timing/upload/'));
      const file = (req.request.body as FormData).get('files') as File;

      void file.text().then((text) => {
        const body = JSON.parse(text) as Record<string, unknown>;
        expect(body['surah_id']).toBe(1);
        expect('surah_number' in body).toBeFalse();

        const [first] = body['ayahs'] as Record<string, unknown>[];
        expect(first['ayah_number']).toBe(TIMESTAMPS.ayahs[0].ayah);
        // Seconds, not milliseconds: uploading 400 stored start_ms 400000.
        expect(first['start']).toBe(TIMESTAMPS.ayahs[0].start_ms / 1000);
        expect(first['end']).toBe(TIMESTAMPS.ayahs[0].end_ms / 1000);
        // No internal name may leak: each one cost a round trip to the ingest to discover.
        for (const internal of ['ayah', 'start_ms', 'end_ms']) {
          expect(internal in first).toBeFalse();
        }
        req.flush(uploadResult());
      });
    });

    it('falls back to the recitation-wide file when the track row carries no URL', (done) => {
      // The common case after an upload: the ingest keeps one file per recitation and the track
      // row comes back with no `available_ayah_timings_url`, so without the fallback the editor
      // would open empty on timings that exist.
      const RECITATION_URL = 'https://example.com/recitation-timings.json';

      service
        .load({ ...TRACK, available_ayah_timings_url: null, surah_number: 114 }, RECITATION_URL)
        .subscribe((loaded) => {
          expect(loaded.ayahs.length).toBe(1);
          expect(loaded.ayahs[0]).toEqual({ ayah: 1, start_ms: 400, end_ms: 6703 });
          done();
        });

      httpMock.expectOne(RECITATION_URL).flush([
        {
          surah_number: 114,
          ayahs_timings: [{ ayah_key: '114:1', start_ms: 400, end_ms: 6703 }],
        },
      ]);
    });

    it("prefers the track's own timing file over the recitation-wide one", (done) => {
      service.load(TRACK, 'https://example.com/recitation-timings.json').subscribe(() => done());

      // Only the track's URL is requested; expectOne on the other would fail at verify().
      httpMock.expectOne(TIMINGS_URL).flush({ surah_id: 1, ayahs: [] });
    });

    it('stays an empty editor when neither URL exists', (done) => {
      service.load({ ...TRACK, available_ayah_timings_url: null }, null).subscribe((loaded) => {
        expect(loaded.ayahs).toEqual([]);
        expect(loaded.track_id).toBe(TRACK.id);
        done();
      });

      httpMock.expectNone(() => true);
    });

    it('reads the recitation-wide file the ingest stores', (done) => {
      // The stored file is not the file that was uploaded: an array of surahs, each with
      // `ayahs_timings` keyed `ayah_key` and bounds already in milliseconds.
      service.load({ ...TRACK, surah_number: 114 }).subscribe((loaded) => {
        expect(loaded.surah_number).toBe(114);
        expect(loaded.ayahs.length).toBe(2);
        expect(loaded.ayahs[0]).toEqual({ ayah: 1, start_ms: 400, end_ms: 6703 });
        expect(loaded.ayahs[1].ayah).toBe(2);
        done();
      });

      httpMock.expectOne(TIMINGS_URL).flush([
        { surah_number: 108, ayahs_count: 3, ayahs_timings: [] },
        {
          surah_number: 114,
          ayahs_count: 6,
          ayahs_timings: [
            { ayah_key: '114:1', start_ms: 400, end_ms: 6703, duration_ms: 6303 },
            { ayah_key: '114:2', start_ms: 6953, end_ms: 13256, duration_ms: 6303 },
          ],
        },
      ]);
    });

    it('reads a bare `start` as seconds and a `start_ms` as milliseconds', (done) => {
      service.load(TRACK).subscribe((loaded) => {
        expect(loaded.ayahs[0].start_ms).toBe(400);
        expect(loaded.ayahs[0].end_ms).toBe(6703);
        done();
      });

      httpMock
        .expectOne(TIMINGS_URL)
        .flush({ surah_id: 1, ayahs: [{ ayah_number: 1, start: 0.4, end: 6.703 }] });
    });

    it('writes back what a load can read', (done) => {
      service.save({ assetId: 7, track: TRACK, timestamps: TIMESTAMPS }).subscribe(() => done());

      const req = httpMock.expectOne((r) => r.url.includes('/portal/timing/upload/'));
      const file = (req.request.body as FormData).get('files') as File;

      void file.text().then((text) => {
        service.load(TRACK).subscribe((reloaded) => {
          expect(reloaded).toEqual(TIMESTAMPS);
        });
        httpMock.expectOne(TIMINGS_URL).flush(JSON.parse(text));
        req.flush(uploadResult());
      });
    });

    it('fails a 200 that left this surah unmatched', (done) => {
      service.save({ assetId: 7, track: TRACK, timestamps: TIMESTAMPS }).subscribe({
        error: (error: unknown) => {
          expect(error).toBeInstanceOf(TimingUploadRejectedError);
          expect((error as TimingUploadRejectedError).result.missing_tracks).toEqual([1]);
          done();
        },
      });

      httpMock
        .expectOne((r) => r.url.includes('/portal/timing/upload/'))
        .flush(uploadResult({ missing_tracks: [1], updated_total: 0 }));
    });

    it('fails a 200 that rejected the file', (done) => {
      service.save({ assetId: 7, track: TRACK, timestamps: TIMESTAMPS }).subscribe({
        error: (error: unknown) => {
          expect(error).toBeInstanceOf(TimingUploadRejectedError);
          done();
        },
      });

      httpMock
        .expectOne((r) => r.url.includes('/portal/timing/upload/'))
        .flush(uploadResult({ file_errors: ['001.json: malformed'] }));
    });

    it('fails a 200 that applied nothing at all', (done) => {
      service.save({ assetId: 7, track: TRACK, timestamps: TIMESTAMPS }).subscribe({
        error: (error: unknown) => {
          expect(error).toBeInstanceOf(TimingUploadRejectedError);
          done();
        },
      });

      httpMock
        .expectOne((r) => r.url.includes('/portal/timing/upload/'))
        .flush(uploadResult({ created_total: 0, updated_total: 0, skipped_total: 1 }));
    });
  });
});
