import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ReciterDetails,
  ReciterFormValue,
  ReciterListFilters,
  ReciterListItem,
  ReciterPatchValue,
  RecitersListResponse,
} from '../models/reciters.models';

@Injectable({ providedIn: 'root' })
export class RecitersAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/reciters/`;

  getList(filters: ReciterListFilters): Observable<RecitersListResponse> {
    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('page_size', filters.page_size.toString());

    if (filters.search) params = params.set('search', filters.search);
    if (filters.name_ar) params = params.set('name_ar', filters.name_ar);
    if (filters.name_en) params = params.set('name_en', filters.name_en);
    if (filters.bio_ar) params = params.set('bio_ar', filters.bio_ar);
    if (filters.bio_en) params = params.set('bio_en', filters.bio_en);
    if (filters.ordering) params = params.set('ordering', filters.ordering);

    return this.http.get<RecitersListResponse>(this.apiUrl, { params });
  }

  getDetail(slug: string): Observable<ReciterDetails> {
    return this.http.get<ReciterDetails>(`${this.apiUrl}${slug}/`);
  }

  create(body: ReciterFormValue): Observable<ReciterListItem> {
    return this.http.post<ReciterListItem>(this.apiUrl, this.toCreateFormData(body));
  }

  patch(slug: string, body: ReciterPatchValue): Observable<ReciterDetails> {
    return this.http.patch<ReciterDetails>(`${this.apiUrl}${slug}/`, this.toPatchFormData(body));
  }

  delete(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${slug}/`);
  }

  private toCreateFormData(payload: ReciterFormValue): FormData {
    const data = new FormData();
    data.append('name_ar', payload.name_ar);
    data.append('name_en', payload.name_en ?? '');
    data.append('bio_ar', payload.bio_ar ?? '');
    data.append('bio_en', payload.bio_en ?? '');
    if (payload.nationality) data.append('nationality', payload.nationality);
    if (payload.date_of_death) data.append('date_of_death', payload.date_of_death);
    if (payload.image) data.append('image', payload.image);
    return data;
  }

  /**
   * Partial multipart PATCH — only changed keys are appended. Empty strings are never
   * sent for `date_of_death` (API rejects them); omit the field when unchanged or cleared.
   */
  private toPatchFormData(payload: ReciterPatchValue): FormData {
    const data = new FormData();
    if (payload.name_ar !== undefined) data.append('name_ar', payload.name_ar);
    if (payload.name_en !== undefined) data.append('name_en', payload.name_en);
    if (payload.bio_ar !== undefined) data.append('bio_ar', payload.bio_ar);
    if (payload.bio_en !== undefined) data.append('bio_en', payload.bio_en);
    if (payload.nationality !== undefined) {
      data.append('nationality', payload.nationality ?? '');
    }
    if (payload.date_of_death) {
      data.append('date_of_death', payload.date_of_death);
    }
    if (payload.image) data.append('image', payload.image);
    return data;
  }
}
