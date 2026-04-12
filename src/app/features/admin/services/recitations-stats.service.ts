import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { forkJoin, map, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { RecitationsStats } from '../models/recitations-stats.model';

interface PaginatedResponse {
  count: number;
  results: unknown[];
}

@Injectable({
  providedIn: 'root',
})
export class RecitationsStatsService {
  private readonly http = inject(HttpClient);
  private readonly messages = inject(NzMessageService);
  private readonly translate = inject(TranslateService);

  private readonly BASE_URL = environment.API_BASE_URL;

  /**
   * Get recitations statistics: total riwayas, reciters, and recitations.
   *
   * - Tries to use the real API endpoints:
   *   - /riwayas/
   *   - /reciters/
   *   - /recitations/
   * - If any request fails, the stream errors and a global toaster is shown.
   */
  getStats(): Observable<RecitationsStats> {
    const riwayas$ = this.http
      .get<PaginatedResponse>(`${this.BASE_URL}/riwayas/`, {
        params: { page_size: '1' },
      })
      .pipe(map((r) => r.count));

    const reciters$ = this.http
      .get<PaginatedResponse>(`${this.BASE_URL}/reciters/`, {
        params: { page_size: '1' },
      })
      .pipe(map((r) => r.count));

    const recitations$ = this.http
      .get<PaginatedResponse>(`${this.BASE_URL}/recitations/`, {
        params: { page_size: '1' },
      })
      .pipe(map((r) => r.count));

    return forkJoin([riwayas$, reciters$, recitations$]).pipe(
      map(([riwayas, reciters, recitations]) => ({
        riwayas,
        reciters,
        recitations,
        isMock: false,
      })),
      catchError(() => {
        this.messages.error(this.translate.instant('ADMIN.RECITATIONS.STATS_LOAD_ERROR'));
        return throwError(() => new Error('Failed to load recitation stats'));
      })
    );
  }
}
