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
    return this.http.post<TafsirDetails>(this.apiUrl, this.toFormData(body));
  }

  update(slug: string, body: TafsirFormValue): Observable<TafsirDetails> {
    return this.http.put<TafsirDetails>(`${this.apiUrl}${slug}/`, this.toFormData(body));
  }

  patch(slug: string, body: Partial<TafsirFormValue>): Observable<TafsirDetails> {
    return this.http.patch<TafsirDetails>(`${this.apiUrl}${slug}/`, this.toFormData(body));
  }

  delete(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${slug}/`);
  }

  private toFormData(payload: Partial<TafsirFormValue>): FormData {
    const data = new FormData();
    const append = (key: string, value: string | number | boolean | null | undefined): void => {
      if (value === null || value === undefined || value === '') return;
      data.append(key, String(value));
    };

    append('name_ar', payload.name_ar);
    append('name_en', payload.name_en);
    append('description_ar', payload.description_ar);
    append('description_en', payload.description_en);
    append('long_description_ar', payload.long_description_ar);
    append('long_description_en', payload.long_description_en);
    append('license', payload.license);
    append('language', payload.language);
    append('publisher_id', payload.publisher_id);
    if (payload.is_external !== undefined) {
      data.append('is_external', String(payload.is_external));
    }
    append('external_url', payload.external_url);
    if (payload.thumbnail) {
      data.append('thumbnail', payload.thumbnail);
    }

    return data;
  }
}
