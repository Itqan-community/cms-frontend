import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
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

  qiraahOptions(search?: string, page = 1, page_size = 200): Observable<NamedId[]> {
    let params = new HttpParams().set('page', page.toString()).set('page_size', page_size.toString());
    if (search) params = params.set('search', search);

    return this.http
      .get<{ results: Array<{ id: number; name: string; bio?: string }>; count: number }>(
        this.qiraahsFilterApiUrl,
        { params }
      )
      .pipe(map((res) => res.results.map((item) => ({ id: item.id, name: item.name }))));
  }

  riwayahOptions(
    qiraah_id?: number | null,
    search?: string,
    page = 1,
    page_size = 200
  ): Observable<NamedId[]> {
    let params = new HttpParams().set('page', page.toString()).set('page_size', page_size.toString());
    if (qiraah_id != null) params = params.set('qiraah_id', qiraah_id.toString());
    if (search) params = params.set('search', search);

    return this.http
      .get<{ results: Array<{ id: number; name: string; bio?: string; qiraah_id?: number }>; count: number }>(
        this.riwayahsFilterApiUrl,
        { params }
      )
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
    if (filters.qiraah_id != null)
      params = params.set('qiraah_id', filters.qiraah_id.toString());
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
}
