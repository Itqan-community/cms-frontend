import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
// import { environment } from '../../../../../environments/environment';
import {
  ApiRecitations,
  Recitation,
  RecitationFilter,
  RecitationStats,
} from '../../models/recitations.models';

const MOCK_STATS: RecitationStats = {
  totalRiwayas: 2,
  totalReciters: 6,
  totalRecitations: 2,
};

@Injectable({
  providedIn: 'root',
})
export class RecitationsService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = 'https://api.cms.itqan.dev';

  constructor() {}

  getStats(): Observable<RecitationStats> {
    return of(MOCK_STATS);
  }

  getRecitations(filter?: RecitationFilter): Observable<ApiRecitations> {
    let params = new HttpParams();

    if (filter) {
      if (filter.searchQuery && filter.searchQuery.trim() !== '') {
        params = params.append('search', filter.searchQuery.trim());
      }
      if (filter.riwayah) {
        params = params.append('riwayah', filter.riwayah);
      }
      if (filter.recitationType) {
        params = params.append('recitation_type', filter.recitationType);
      }
      if (filter.page) {
        params = params.append('page', filter.page.toString());
      }
    }
    return this.http.get<ApiRecitations>(`${this.BASE_URL}/recitations/`, { params: params });
  }
}
