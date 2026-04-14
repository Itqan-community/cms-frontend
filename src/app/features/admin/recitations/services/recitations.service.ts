import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type {
  RecitationSurahTrackListItem,
  RecitationTrackDeleteTracksIn,
  RecitationTrackOut,
  RecitationTrackUploadAbortIn,
  RecitationTrackUploadAbortOut,
  RecitationTrackUploadFinishIn,
  RecitationTrackUploadFinishOut,
  RecitationTrackUploadSignPartIn,
  RecitationTrackUploadSignPartOut,
  RecitationTrackUploadStartIn,
  RecitationTrackUploadStartOut,
  RecitationTrackValidateUploadIn,
  RecitationTrackValidateUploadOut,
} from '../models/recitation-tracks.models';
import {
  NamedId,
  RecitationDetails,
  RecitationFormValue,
  RecitationListFilters,
  RecitationsListResponse,
} from '../models/recitations.models';

@Injectable({ providedIn: 'root' })
export class RecitationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/recitations/`;
  private readonly qiraahsFilterApiUrl = `${environment.ADMIN_API_BASE_URL}/filters/qiraahs/`;
  private readonly riwayahsFilterApiUrl = `${environment.ADMIN_API_BASE_URL}/filters/riwayahs/`;
  private readonly recitationTracksBaseUrl = `${environment.ADMIN_API_BASE_URL}/recitation-tracks`;
  private readonly portalBaseUrl = environment.ADMIN_API_BASE_URL;

  qiraahOptions(search?: string, page = 1, page_size = 200): Observable<NamedId[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', page_size.toString());
    if (search) params = params.set('search', search);

    return this.http
      .get<{
        results: { id: number; name: string; bio?: string }[];
        count: number;
      }>(this.qiraahsFilterApiUrl, { params })
      .pipe(map((res) => res.results.map((item) => ({ id: item.id, name: item.name }))));
  }

  riwayahOptions(
    qiraah_id?: number | null,
    search?: string,
    page = 1,
    page_size = 200
  ): Observable<NamedId[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', page_size.toString());
    if (qiraah_id != null) params = params.set('qiraah_id', qiraah_id.toString());
    if (search) params = params.set('search', search);

    return this.http
      .get<{
        results: { id: number; name: string; bio?: string; qiraah_id?: number }[];
        count: number;
      }>(this.riwayahsFilterApiUrl, { params })
      .pipe(map((res) => res.results.map((item) => ({ id: item.id, name: item.name }))));
  }

  getList(filters: RecitationListFilters): Observable<RecitationsListResponse> {
    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('page_size', filters.page_size.toString());

    if (filters.search) params = params.set('search', filters.search);
    if (filters.publisher_id != null)
      params = params.set('publisher_id', filters.publisher_id.toString());
    if (filters.reciter_id != null)
      params = params.set('reciter_id', filters.reciter_id.toString());
    if (filters.qiraah_id != null) params = params.set('qiraah_id', filters.qiraah_id.toString());
    if (filters.riwayah_id != null)
      params = params.set('riwayah_id', filters.riwayah_id.toString());
    if (filters.madd_level != null) params = params.set('madd_level', filters.madd_level);
    if (filters.meem_behaviour != null)
      params = params.set('meem_behaviour', filters.meem_behaviour);
    if (filters.year != null) params = params.set('year', String(filters.year));
    if (filters.license_code) params = params.set('license_code', filters.license_code);
    if (filters.ordering) params = params.set('ordering', filters.ordering);

    return this.http.get<RecitationsListResponse>(this.apiUrl, { params });
  }

  getDetail(slug: string): Observable<RecitationDetails> {
    return this.http.get<RecitationDetails>(`${this.apiUrl}${slug}/`);
  }

  create(body: RecitationFormValue): Observable<RecitationDetails> {
    return this.http.post<RecitationDetails>(this.apiUrl, body);
  }

  patch(slug: string, body: Partial<RecitationFormValue>): Observable<RecitationDetails> {
    return this.http.patch<RecitationDetails>(`${this.apiUrl}${slug}/`, body);
  }

  delete(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${slug}/`);
  }

  // --- Recitation surah tracks (portal) ---

  recitationTracksValidateUpload(
    body: RecitationTrackValidateUploadIn
  ): Observable<RecitationTrackValidateUploadOut> {
    return this.http.post<RecitationTrackValidateUploadOut>(
      `${this.recitationTracksBaseUrl}/validate-upload/`,
      body
    );
  }

  recitationTracksDelete(body: RecitationTrackDeleteTracksIn): Observable<void> {
    return this.http.request<void>('DELETE', `${this.recitationTracksBaseUrl}/`, { body });
  }

  recitationTracksUploadStart(
    body: RecitationTrackUploadStartIn
  ): Observable<RecitationTrackUploadStartOut> {
    return this.http.post<RecitationTrackUploadStartOut>(
      `${this.recitationTracksBaseUrl}/uploads/start/`,
      body
    );
  }

  recitationTracksUploadSignPart(
    body: RecitationTrackUploadSignPartIn
  ): Observable<RecitationTrackUploadSignPartOut> {
    return this.http.post<RecitationTrackUploadSignPartOut>(
      `${this.recitationTracksBaseUrl}/uploads/sign-part/`,
      body
    );
  }

  recitationTracksUploadFinish(
    body: RecitationTrackUploadFinishIn
  ): Observable<RecitationTrackUploadFinishOut> {
    return this.http.post<RecitationTrackUploadFinishOut>(
      `${this.recitationTracksBaseUrl}/uploads/finish/`,
      body
    );
  }

  recitationTracksUploadAbort(
    body: RecitationTrackUploadAbortIn
  ): Observable<RecitationTrackUploadAbortOut> {
    return this.http.post<RecitationTrackUploadAbortOut>(
      `${this.recitationTracksBaseUrl}/uploads/abort/`,
      body
    );
  }

  /**
   * GET /portal/assets/{asset_id}/recitation-tracks/?page=&page_size=
   */
  recitationTracksList(params: {
    asset_id: number;
    page?: number;
    page_size?: number;
  }): Observable<{ results: RecitationSurahTrackListItem[]; count: number }> {
    const httpParams = new HttpParams()
      .set('page', (params.page ?? 1).toString())
      .set('page_size', (params.page_size ?? 10).toString());

    const url = `${this.portalBaseUrl}/assets/${params.asset_id}/recitation-tracks/`;

    return this.http
      .get<{ results: RecitationTrackOut[]; count: number }>(url, { params: httpParams })
      .pipe(
        map((res) => ({
          results: res.results.map((row) => this.mapAssetTrackRow(row, params.asset_id)),
          count: res.count,
        }))
      );
  }

  private mapAssetTrackRow(row: RecitationTrackOut, assetId: number): RecitationSurahTrackListItem {
    return {
      id: row.id,
      asset_id: assetId,
      surah_number: row.surah_number,
      filename: row.filename,
      duration_ms: row.duration_ms,
      size_bytes: row.size_bytes,
      audio_url: row.audio_url ?? '',
    };
  }
}
