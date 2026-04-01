import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { RecitationItem } from '../models/recitations.models';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root',
})
export class RecitationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_BASE_URL}/recitations/`;

  getRecitations(
    page: number = 1,
    pageSize: number = 10,
    search: string = '',
    riwayah?: string,
    type?: string
  ): Observable<PaginatedResponse<RecitationItem>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    if (riwayah) {
      params = params.set('riwayah', riwayah);
    }
    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<PaginatedResponse<RecitationItem>>(this.apiUrl, { params });
  }

  deleteRecitation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
