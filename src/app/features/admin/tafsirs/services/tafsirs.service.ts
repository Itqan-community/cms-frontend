import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  TafsirDetails,
  TafsirFilters,
  TafsirFormValue,
  TafsirsList,
} from '../models/tafsirs.models';

@Injectable({
  providedIn: 'root',
})
export class TafsirsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/tafsirs/`;

  getList(filters: TafsirFilters): Observable<TafsirsList> {
    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('page_size', filters.page_size.toString());

    if (filters.search) params = params.set('search', filters.search);
    if (filters.publisher_id != null)
      params = params.set('publisher_id', filters.publisher_id.toString());
    if (filters.license_code) params = params.set('license_code', filters.license_code);
    if (filters.language) params = params.set('language', filters.language);
    if (filters.is_external != null)
      params = params.set('is_external', filters.is_external.toString());
    if (filters.ordering) params = params.set('ordering', filters.ordering);

    return this.http.get<TafsirsList>(this.apiUrl, { params });
  }

  getDetail(slug: string): Observable<TafsirDetails> {
    return this.http.get<TafsirDetails>(`${this.apiUrl}${slug}/`);
  }

  create(body: TafsirFormValue): Observable<TafsirDetails> {
    return this.http.post<TafsirDetails>(this.apiUrl, body);
  }

  update(slug: string, body: TafsirFormValue): Observable<TafsirDetails> {
    return this.http.put<TafsirDetails>(`${this.apiUrl}${slug}/`, body);
  }

  patch(slug: string, body: Partial<TafsirFormValue>): Observable<TafsirDetails> {
    return this.http.patch<TafsirDetails>(`${this.apiUrl}${slug}/`, body);
  }

  delete(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${slug}/`);
  }
}
