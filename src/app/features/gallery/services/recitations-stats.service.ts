import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { RecitationsStats } from '../models/recitations-stats.model';

interface PaginatedResponse {
  count: number;
  results: unknown[];
}

/**
 * Token to mark requests that should be skipped by the auth error interceptor.
 * Used for public/stats endpoints so 401/403 errors don't trigger a login redirect.
 */
export const SKIP_AUTH_ERROR = new HttpContextToken<boolean>(() => false);

@Injectable({
  providedIn: 'root',
})
export class RecitationsStatsService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  private readonly skipAuthContext = new HttpContext().set(SKIP_AUTH_ERROR, true);

  /**
   * Get recitations statistics: total riwayas, reciters, and recitations.
   * Falls back to 0 on any error so the UI never breaks or redirects.
   */
  getStats(): Observable<RecitationsStats> {
    const riwayas$ = this.http
      .get<PaginatedResponse>(`${this.BASE_URL}/riwayas/`, {
        params: { page_size: '1' },
        context: this.skipAuthContext,
      })
      .pipe(
        map((r) => r.count),
        catchError(() => of(0))
      );

    const reciters$ = this.http
      .get<PaginatedResponse>(`${this.BASE_URL}/reciters/`, {
        params: { page_size: '1' },
        context: this.skipAuthContext,
      })
      .pipe(
        map((r) => r.count),
        catchError(() => of(0))
      );

    const recitations$ = this.http
      .get<PaginatedResponse>(`${this.BASE_URL}/recitations/`, {
        params: { page_size: '1' },
        context: this.skipAuthContext,
      })
      .pipe(
        map((r) => r.count),
        catchError(() => of(0))
      );

    return forkJoin([riwayas$, reciters$, recitations$]).pipe(
      map(([riwayas, reciters, recitations]) => ({ riwayas, reciters, recitations }))
    );
  }
}
