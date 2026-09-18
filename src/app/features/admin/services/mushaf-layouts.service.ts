import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import type { MushafLayout } from '../models/asset-content.models';

/** Mushaf layouts — the pagination a page-based asset follows. */
@Injectable({ providedIn: 'root' })
export class MushafLayoutsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.ADMIN_API_BASE_URL;

  /**
   * Every layout, for the create-asset selector. The list is small (one row per
   * mushaf printing), so it is fetched in a single page rather than paged.
   */
  list(): Observable<MushafLayout[]> {
    const params = new HttpParams().set('page_size', '1000');
    return this.http
      .get<{ results: MushafLayout[]; count: number }>(`${this.base}/mushaf-layouts/`, { params })
      .pipe(map((response) => response.results));
  }
}
