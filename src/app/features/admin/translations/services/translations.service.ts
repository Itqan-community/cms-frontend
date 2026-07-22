import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  TranslationDetails,
  TranslationFilters,
  TranslationFormValue,
  TranslationsList,
} from '../models/translations.models';

@Injectable({
  providedIn: 'root',
})
export class TranslationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/translations/`;

  getList(filters: TranslationFilters): Observable<TranslationsList> {
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
    if (filters.is_open_access != null)
      params = params.set('is_open_access', filters.is_open_access.toString());
    if (filters.ordering) params = params.set('ordering', filters.ordering);

    return this.http.get<TranslationsList>(this.apiUrl, { params });
  }

  getDetail(slug: string): Observable<TranslationDetails> {
    return this.http.get<TranslationDetails>(`${this.apiUrl}${slug}/`);
  }

  create(body: TranslationFormValue): Observable<TranslationDetails> {
    return this.http.post<TranslationDetails>(this.apiUrl, this.toCreateFormData(body));
  }

  update(slug: string, body: TranslationFormValue): Observable<TranslationDetails> {
    return this.http.put<TranslationDetails>(`${this.apiUrl}${slug}/`, body);
  }

  patch(slug: string, body: Partial<TranslationFormValue>): Observable<TranslationDetails> {
    return this.http.patch<TranslationDetails>(`${this.apiUrl}${slug}/`, body);
  }

  delete(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${slug}/`);
  }

  /** Multipart create (backend requires Form data when attaching an initial version file). */
  private toCreateFormData(payload: TranslationFormValue): FormData {
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
    data.append('is_external', String(payload.is_external));
    data.append('is_open_access', String(payload.is_open_access));
    data.append('restricted_for_tenant', String(payload.restricted_for_tenant));
    append('external_url', payload.external_url);
    append('version_name', payload.version_name);
    append('version_summary', payload.version_summary);
    if (payload.file) {
      data.append('file', payload.file);
    }

    return data;
  }
}
