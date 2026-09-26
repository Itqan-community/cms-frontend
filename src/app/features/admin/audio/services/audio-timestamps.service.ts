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
   * Current ayah boundaries for one track, read from the timing file the track points at.
   *
   * The URL is absolute and outside the API origin, so none of the app's interceptors touch
   * it — no tenant header, no credentials, no error toast. A track with no timings yet has no
   * URL, and that is an empty editor rather than a failure.
   */
  load(track: TimestampTrackRef): Observable<TrackTimestamps> {
    const url = track.available_ayah_timings_url;
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

// --- timing file codec ---------------------------------------------------------------------
// The only code that knows what is inside a timing file. Both directions live together so a
// change to the format is one edit, and so a save always writes back what a load can read.

/** The file body, as written by `serializeTimingFile`. */
interface TimingFile {
  surah_number: number;
  surah?: { start_ms: number; end_ms: number } | null;
  ayahs: AyahTimestamp[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads one track's boundaries out of a timing file.
 *
 * Two layouts are accepted because both exist in the wild: a file holding a single surah, and
 * a recitation-wide file keyed by surah number. The second is narrowed to this track's surah.
 */
function parseTimingFile(raw: unknown, track: TimestampTrackRef): TrackTimestamps {
  const body = selectSurah(raw, track.surah_number);

  return {
    track_id: track.id,
    surah_number: readNumber(body?.['surah_number']) ?? track.surah_number,
    surah: readBounds(body?.['surah']),
    ayahs: readAyahs(body?.['ayahs'] ?? body?.['verses']),
  };
}

/** Unwraps a surah-keyed container; a single-surah file is returned as-is. */
function selectSurah(raw: unknown, surahNumber: number): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  if ('ayahs' in raw || 'verses' in raw) return raw;

  const keyed = raw[String(surahNumber)];
  return isRecord(keyed) ? keyed : null;
}

function readAyahs(raw: unknown): AyahTimestamp[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isRecord)
    .map((entry) => ({
      ayah: readNumber(entry['ayah'] ?? entry['ayah_number'] ?? entry['verse']) ?? 0,
      start_ms: readNumber(entry['start_ms'] ?? entry['start']) ?? 0,
      end_ms: readNumber(entry['end_ms'] ?? entry['end']) ?? 0,
    }))
    .filter((entry) => entry.ayah > 0)
    .sort((a, b) => a.ayah - b.ayah);
}

function readBounds(raw: unknown): { start_ms: number; end_ms: number } | null {
  if (!isRecord(raw)) return null;

  const start = readNumber(raw['start_ms'] ?? raw['start']);
  const end = readNumber(raw['end_ms'] ?? raw['end']);

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
 * The name carries the match: the ingest pairs a timing file with a track the same way the
 * audio upload did, by the surah in the filename, so reusing the audio file's own stem is the
 * pairing that is already known to work. A track with no filename falls back to the padded
 * surah number, which is the convention the stems follow anyway.
 */
function serializeTimingFile(timestamps: TrackTimestamps, track: TimestampTrackRef): File {
  const body: TimingFile = {
    surah_number: timestamps.surah_number || track.surah_number,
    surah: timestamps.surah,
    ayahs: timestamps.ayahs,
  };

  return new File([JSON.stringify(body)], timingFilename(track), { type: 'application/json' });
}

function timingFilename(track: TimestampTrackRef): string {
  const stem = track.filename?.replace(/\.[^./\\]+$/, '').trim();

  return `${stem || String(track.surah_number).padStart(3, '0')}.json`;
}
