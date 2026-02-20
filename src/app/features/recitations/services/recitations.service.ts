import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiRecitations, RecitationsStats } from '../models/recitation.model';

@Injectable({
  providedIn: 'root',
})
export class RecitationsService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  getRecitationsStats(): Observable<RecitationsStats> {
    return this.http.get<RecitationsStats>(`${this.BASE_URL}/recitations/stats/`);
  }

  getRecitations(
    page = 1,
    pageSize = 10,
    search = '',
    riwayah = '',
    recitationType = ''
  ): Observable<ApiRecitations> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (riwayah) {
      params = params.set('riwayah', riwayah);
    }
    if (recitationType) {
      params = params.set('recitation_type', recitationType);
    }

    return this.http.get<ApiRecitations>(`${this.BASE_URL}/recitations/`, { params });
  }

  deleteRecitation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/recitations/${id}/`);
  }
}
