import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import type { RecitationTimingUploadOut } from '../../recitations/models/recitation-timings.models';
import type { RecitationSurahTrackListItem } from '../../recitations/models/recitation-tracks.models';
import { RecitationsService } from '../../recitations/services/recitations.service';
import type { AyahTimestamp, TrackTimestamps } from '../models/audio-timestamps.models';

/** What the editor needs to know about a track to read and write its timings. */
export type TimestampTrackRef = Pick<
  RecitationSurahTrackListItem,
  'id' | 'surah_number' | 'filename' | 'available_ayah_timings_url'
>;

/** Everything `POST /portal/timing/upload/` needs for a one-track save. */
export interface SaveTimestampsInput {
  /** Recitation id — the upload API's `asset_id`. */
  assetId: number;
  /** Folder the track lives in. Omitted saves into the recitation's default folder. */
  folderId?: number | null;
  track: TimestampTrackRef;
  timestamps: TrackTimestamps;
}

/**
 * The single point of contact between the timestamp editor and the portal API.
 *
 * Reads and writes go to different places, which is not an accident of the contract but the
 * shape of it: timings are stored as a **file**, so the editor reads the file directly from
 * `track.available_ayah_timings_url` and writes by re-uploading it through the existing
 * `POST /portal/timing/upload/` ingest — the same endpoint the bulk upload on the recitation
 * detail page uses. There is no per-track write endpoint to call instead.
 *
 * ⚠️ The one thing still inferred is the **body** of the timing file — `parseTimingFile` and
 * `serializeTimingFile` below are the only code that depends on it. Everything else (which URL,
 * which endpoint, which response type) is fixed.
 */
@Injectable({ providedIn: 'root' })
export class AudioTimestampsService {
  private readonly http = inject(HttpClient);
  private readonly recitations = inject(RecitationsService);

  /**
   * Current ayah boundaries for one track.
   *
   * Read from the track's own timing file when it has one, and otherwise from
   * `recitationTimingsUrl` — the recitation-wide file the ingest actually maintains. That
   * fallback is not a nicety: the upload merges every surah into one file per recitation, and
   * `available_ayah_timings_url` on a track row comes back absent even once timings exist, so
   * without it a freshly uploaded surah opens as an empty editor. `parseTimingFile` narrows the
   * recitation-wide array down to this track's surah.
   *
   * The URL is absolute and outside the API origin, so none of the app's interceptors touch
   * it — no tenant header, no credentials, no error toast. A track with neither URL genuinely
   * has no timings, and that is an empty editor rather than a failure.
   */
  load(
    track: TimestampTrackRef,
    recitationTimingsUrl?: string | null
  ): Observable<TrackTimestamps> {
    const url = track.available_ayah_timings_url ?? recitationTimingsUrl;
    if (!url) return of(emptyTimestamps(track));

    return this.http
      .get<unknown>(url, { responseType: 'json' })
      .pipe(map((raw) => parseTimingFile(raw, track)));
  }

  /**
   * Replaces the stored boundaries for one track by re-uploading its timing file.
   *
   * A 200 is not by itself a success: the ingest reports per-file outcomes in the body, so a
   * file it could not match to a track comes back as `missing_tracks` with everything else
   * looking fine. `TimingUploadRejectedError` turns that into a thrown error for the caller.
   */
  save(input: SaveTimestampsInput): Observable<RecitationTimingUploadOut> {
    const file = serializeTimingFile(input.timestamps, input.track);

    return this.recitations
      .recitationTimingUpload(input.assetId, [file], input.folderId)
      .pipe(map((out) => assertAccepted(out, input.track)));
  }
}

/** A 200 that applied nothing — the surah went unmatched, or the file itself was rejected. */
export class TimingUploadRejectedError extends Error {
  constructor(readonly result: RecitationTimingUploadOut) {
    super('timing upload rejected');
  }
}

function assertAccepted(
  out: RecitationTimingUploadOut,
  track: TimestampTrackRef
): RecitationTimingUploadOut {
  const unmatched = out.missing_tracks?.includes(track.surah_number) ?? false;
  const rejected = (out.file_errors?.length ?? 0) > 0;
  const applied = (out.created_total ?? 0) + (out.updated_total ?? 0) > 0;

  if (unmatched || rejected || !applied) throw new TimingUploadRejectedError(out);

  return out;
}

function emptyTimestamps(track: TimestampTrackRef): TrackTimestamps {
  return { track_id: track.id, surah_number: track.surah_number, surah: null, ayahs: [] };
}

const MS_PER_SECOND = 1000;

// --- timing file codec ---------------------------------------------------------------------
// The only code that knows what is inside a timing file. Both directions live together so a
// change to the format is one edit, and so a save always writes back what a load can read.

/**
 * One ayah entry on the wire: `ayah_number`, `start`, `end` — none of which match the internal
 * `ayah` / `start_ms` / `end_ms`. Each name was learnt from a bare KeyError in `file_errors`
 * (`'ayah_number'`, then `'start'`).
 *
 * **`start` and `end` are seconds**, not milliseconds. Uploading `start: 400` stored
 * `start_ms: 400000`, so the ingest multiplies by 1000 — the missing `_ms` suffix is literal.
 * Sending milliseconds puts every boundary 1000× past the end of the track, which the ingest
 * counts as `skipped_total` rather than an error.
 */
interface TimingFileAyah {
  ayah_number: number;
  /** Seconds. */
  start: number;
  /** Seconds. */
  end: number;
}

/**
 * The file body, as written by `serializeTimingFile`.
 *
 * Two key names are confirmed by rejections from the ingest rather than by a schema:
 * `surah_id` (not `surah_number`) and each entry's `ayah_number` (not `ayah`). The reader below
 * still accepts the other spellings, since files written before this was known are in the wild.
 */
interface TimingFile {
  /** The **surah number** (1–114), not a track id — see `serializeTimingFile`. */
  surah_id: number;
  /**
   * Seconds, spelled like the ayah entries. The stored file carries no surah bounds at all, so
   * this is written for symmetry with the reader and appears to be ignored.
   */
  surah?: { start: number; end: number } | null;
  ayahs: TimingFileAyah[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads one track's boundaries out of a timing file.
 *
 * Three layouts are accepted, because the file that is read is not the file that was written.
 * A save uploads one surah; the ingest merges it into a **recitation-wide array** and serves
 * that back, in its own vocabulary (`ayahs_timings`, `ayah_key`, real `start_ms`). So the
 * reader has to understand the stored shape as well as its own.
 */
function parseTimingFile(raw: unknown, track: TimestampTrackRef): TrackTimestamps {
  const body = selectSurah(raw, track.surah_number);

  return {
    track_id: track.id,
    surah_number: readNumber(body?.['surah_id'] ?? body?.['surah_number']) ?? track.surah_number,
    surah: readBounds(body?.['surah']),
    ayahs: readAyahs(body?.['ayahs_timings'] ?? body?.['ayahs'] ?? body?.['verses']),
  };
}

/**
 * Narrows a container down to this track's surah. Handles the stored recitation-wide array,
 * an object keyed by surah number, and a file holding a single surah.
 */
function selectSurah(raw: unknown, surahNumber: number): Record<string, unknown> | null {
  if (Array.isArray(raw)) {
    return (
      raw
        .filter(isRecord)
        .find((entry) => readNumber(entry['surah_number'] ?? entry['surah_id']) === surahNumber) ??
      null
    );
  }

  if (!isRecord(raw)) return null;
  if ('ayahs_timings' in raw || 'ayahs' in raw || 'verses' in raw) return raw;

  const keyed = raw[String(surahNumber)];
  return isRecord(keyed) ? keyed : null;
}

function readAyahs(raw: unknown): AyahTimestamp[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isRecord)
    .map((entry) => ({
      ayah: readAyahNumber(entry),
      start_ms: readMilliseconds(entry, 'start') ?? 0,
      end_ms: readMilliseconds(entry, 'end') ?? 0,
    }))
    .filter((entry) => entry.ayah > 0)
    .sort((a, b) => a.ayah - b.ayah);
}

/** The stored file identifies an ayah as `"114:1"`; an uploaded one as a plain number. */
function readAyahNumber(entry: Record<string, unknown>): number {
  const key = entry['ayah_key'];
  if (typeof key === 'string') return readNumber(key.split(':').at(-1)) ?? 0;

  return readNumber(entry['ayah_number'] ?? entry['ayah'] ?? entry['verse']) ?? 0;
}

/**
 * Reads one bound as milliseconds, whichever vocabulary it arrived in. The suffix carries the
 * unit and is the only thing that does: `start_ms` is already milliseconds, a bare `start` is
 * seconds — that asymmetry is the ingest's, not ours.
 */
function readMilliseconds(entry: Record<string, unknown>, bound: 'start' | 'end'): number | null {
  const ms = readNumber(entry[`${bound}_ms`]);
  if (ms != null) return ms;

  const seconds = readNumber(entry[bound]);
  return seconds == null ? null : Math.round(seconds * MS_PER_SECOND);
}

function readBounds(raw: unknown): { start_ms: number; end_ms: number } | null {
  if (!isRecord(raw)) return null;

  const start = readMilliseconds(raw, 'start');
  const end = readMilliseconds(raw, 'end');

  return start == null || end == null ? null : { start_ms: start, end_ms: end };
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}

/**
 * Writes one track's boundaries back out as the file the ingest expects.
 *
 * **The body carries the match, not the filename.** `surah_id` is what the ingest pairs with a
 * track, and it wants a *surah number* — a file named `001.json` carrying `surah_id: 522` came
 * back as `missing_tracks: [522]`, echoing the body and ignoring the name. `missing_tracks` is
 * a list of surah numbers for the same reason, which is what `assertAccepted` checks against.
 *
 * The filename still follows the audio stem (`114.mp3` → `114.json`) because that is how the
 * files are recognisable to a human in the bucket, not because the pairing depends on it.
 */
function serializeTimingFile(timestamps: TrackTimestamps, track: TimestampTrackRef): File {
  const body: TimingFile = {
    surah_id: timestamps.surah_number || track.surah_number,
    surah: timestamps.surah && {
      start: toSeconds(timestamps.surah.start_ms),
      end: toSeconds(timestamps.surah.end_ms),
    },
    ayahs: timestamps.ayahs.map(toWireAyah),
  };

  return new File([JSON.stringify(body)], timingFilename(track), { type: 'application/json' });
}

/** Internal names → the ingest's; the only place the two vocabularies meet. */
function toWireAyah(ayah: AyahTimestamp): TimingFileAyah {
  return {
    ayah_number: ayah.ayah,
    start: toSeconds(ayah.start_ms),
    end: toSeconds(ayah.end_ms),
  };
}

/**
 * Milliseconds → the seconds the ingest wants, at millisecond precision. Rounded to three
 * decimals so a float artefact never reaches the file as `7.527999999999999`.
 */
function toSeconds(ms: number): number {
  return Number((ms / MS_PER_SECOND).toFixed(3));
}

function timingFilename(track: TimestampTrackRef): string {
  const stem = track.filename?.replace(/\.[^./\\]+$/, '').trim();

  return `${stem || String(track.surah_number).padStart(3, '0')}.json`;
}
