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
    if (filters.ordering) params = params.set('ordering', filters.ordering);

    return this.http.get<TranslationsList>(this.apiUrl, { params });
  }

  getDetail(slug: string): Observable<TranslationDetails> {
    return this.http.get<TranslationDetails>(`${this.apiUrl}${slug}/`);
  }

  create(body: TranslationFormValue): Observable<TranslationDetails> {
    return this.http.post<TranslationDetails>(this.apiUrl, body);
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
}
