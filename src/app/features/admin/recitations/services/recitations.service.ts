import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { RecitationTimingUploadOut } from '../models/recitation-timings.models';
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
  RecitationFolder,
  RecitationFolderApiRow,
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
    if (filters.is_open_access != null)
      params = params.set('is_open_access', filters.is_open_access.toString());
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

  // --- Recitation Folders ---

  getFolders(recitationSlug: string): Observable<RecitationFolder[]> {
    const url = `${this.portalBaseUrl}/recitations/${encodeURIComponent(recitationSlug)}/folders/`;
    return this.http
      .get<{ results?: RecitationFolderApiRow[] } | RecitationFolderApiRow[]>(url)
      .pipe(
        map((res) => {
          const rows = Array.isArray(res) ? res : (res?.results ?? []);
          if (!rows.length) {
            return [{ id: 'default', name: 'Main', isDefault: true, trackCount: 0 }];
          }
          return rows.map((row) => this.mapFolderRow(row));
        }),
        catchError(() => of([{ id: 'default', name: 'Main', isDefault: true, trackCount: 0 }]))
      );
  }

  createFolder(
    recitationSlug: string,
    name: string,
    isDefault = false
  ): Observable<RecitationFolder> {
    const url = `${this.portalBaseUrl}/recitations/${encodeURIComponent(recitationSlug)}/folders/`;
    return this.http
      .post<RecitationFolderApiRow>(url, { name, is_default: isDefault })
      .pipe(map((row) => this.mapFolderRow(row)));
  }

  updateFolder(
    recitationSlug: string,
    folderId: string,
    data: { name?: string; is_default?: boolean }
  ): Observable<RecitationFolder> {
    const url = `${this.portalBaseUrl}/recitations/${encodeURIComponent(recitationSlug)}/folders/${encodeURIComponent(folderId)}/`;
    return this.http
      .patch<RecitationFolderApiRow>(url, data)
      .pipe(map((row) => this.mapFolderRow(row)));
  }

  setDefaultFolder(recitationSlug: string, folderId: string): Observable<RecitationFolder> {
    const url = `${this.portalBaseUrl}/recitations/${encodeURIComponent(recitationSlug)}/folders/${encodeURIComponent(folderId)}/set-default/`;
    return this.http.post<RecitationFolderApiRow>(url, {}).pipe(
      map((row) => this.mapFolderRow(row)),
      catchError(() => this.updateFolder(recitationSlug, folderId, { is_default: true }))
    );
  }

  deleteFolder(recitationSlug: string, folderId: string): Observable<void> {
    const url = `${this.portalBaseUrl}/recitations/${encodeURIComponent(recitationSlug)}/folders/${encodeURIComponent(folderId)}/`;
    return this.http.delete<void>(url);
  }

  private mapFolderRow(row: RecitationFolderApiRow): RecitationFolder {
    return {
      id: String(row.id),
      name: row.name,
      isDefault: Boolean(row.is_default ?? row.isDefault),
      trackCount: row.track_count ?? row.trackCount ?? 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /** POST /portal/timing/upload/ — multipart: asset_id, folder_id, files[] */
  recitationTimingUpload(
    assetId: number,
    files: File[],
    folderId?: string | number | null
  ): Observable<RecitationTimingUploadOut> {
    const formData = new FormData();
    formData.append('asset_id', String(assetId));
    if (folderId != null) {
      formData.append('folder_id', String(folderId));
    }
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    return this.http.post<RecitationTimingUploadOut>(
      `${this.portalBaseUrl}/timing/upload/`,
      formData
    );
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
   * GET /portal/recitations/{slug}/recitation-tracks/?folder_id=&page=&page_size=
   * (Previously numeric asset id in path; backend accepts recitation slug in the same segment.)
   */
  recitationTracksList(params: {
    recitation_slug: string;
    /** Recitation id — upload/delete APIs still use this as `asset_id`; list rows keep it for UI. */
    asset_id: number;
    folder_id?: string | number | null;
    page?: number;
    page_size?: number;
  }): Observable<{ results: RecitationSurahTrackListItem[]; count: number }> {
    let httpParams = new HttpParams()
      .set('page', (params.page ?? 1).toString())
      .set('page_size', (params.page_size ?? 10).toString());

    if (params.folder_id != null) {
      httpParams = httpParams.set('folder_id', params.folder_id.toString());
    }

    const url = `${this.portalBaseUrl}/recitations/${encodeURIComponent(params.recitation_slug)}/recitation-tracks/`;

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
