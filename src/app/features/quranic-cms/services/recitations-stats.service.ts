import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { RecitationsStats } from '../models/recitations-stats.model';

interface PaginatedResponse {
  count: number;
  results: unknown[];
}

const MOCK_STATS: RecitationsStats = {
  riwayas: 2,
  reciters: 6,
  recitations: 2,
  isMock: true,
};

@Injectable({
  providedIn: 'root',
})
export class RecitationsStatsService {
  private readonly http = inject(HttpClient);
  private readonly messages = inject(NzMessageService);

  private readonly BASE_URL = environment.API_BASE_URL;

  /**
   * Get recitations statistics: total riwayas, reciters, and recitations.
   *
   * - Tries to use the real API endpoints:
   *   - /riwayas/
   *   - /reciters/
   *   - /recitations/
   * - If any request fails (for example, endpoints are not ready yet),
   *   it falls back to a clearly labelled MOCK response and shows
   *   a global toaster message.
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
      map(([riwayas, reciters, recitations]) => ({ riwayas, reciters, recitations })),
      catchError(() => {
        this.messages.error(
          'تعذر تحميل إحصائيات التلاوات، يتم عرض بيانات تجريبية (MOCK) مؤقتًا.'
        );
        return of(MOCK_STATS);
      })
    );
  }
}

