import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { AyahTimestamp, TrackTimestamps } from '../models/audio-timestamps.models';

/**
 * The single point of contact between the timestamp editor and the portal API.
 *
 * ⚠️ PROVISIONAL CONTRACT. The issue specifies `POST /api/v1/admin/audio/timestamps/`, but every
 * other admin call in this app goes through `environment.ADMIN_API_BASE_URL` (`…/portal`), and no
 * read endpoint is specified at all. The paths below follow the portal convention and are the only
 * thing that needs changing once the backend contract is confirmed — no component touches HTTP.
 *
 * Open questions tracked with the feature:
 *  1. Is the save path `…/portal/audio/timestamps/` or something else?
 *  2. Is there a GET, or should the editor read `ayah_timings_url` (the JSON file the existing
 *     `POST /portal/timing/upload/` flow produces)?
 *  3. Does the payload replace a whole track, or patch individual markers?
 */
@Injectable({ providedIn: 'root' })
export class AudioTimestampsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.ADMIN_API_BASE_URL}/audio/timestamps/`;

  /** Current ayah boundaries for one recitation track. */
  load(trackId: number): Observable<TrackTimestamps> {
    const params = new HttpParams().set('track_id', String(trackId));

    return this.http
      .get<TrackTimestampsResponse>(this.baseUrl, { params })
      .pipe(map((response) => normalize(response, trackId)));
  }

  /** Replaces the stored boundaries for one track. The audio file is never touched. */
  save(payload: TrackTimestamps): Observable<TrackTimestamps> {
    return this.http
      .post<TrackTimestampsResponse>(this.baseUrl, payload)
      .pipe(map((response) => normalize(response, payload.track_id)));
  }
}

/** Tolerant of the fields the portal may or may not send back. */
interface TrackTimestampsResponse {
  track_id?: number;
  surah_number?: number;
  surah?: { start_ms: number; end_ms: number } | null;
  ayahs?: AyahTimestamp[] | null;
}

function normalize(response: TrackTimestampsResponse, fallbackTrackId: number): TrackTimestamps {
  return {
    track_id: response.track_id ?? fallbackTrackId,
    surah_number: response.surah_number ?? 0,
    surah: response.surah ?? null,
    ayahs: [...(response.ayahs ?? [])].sort((a, b) => a.ayah - b.ayah),
  };
}
