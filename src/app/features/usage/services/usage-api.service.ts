import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BreakdownOptions,
  PublicUsageCounts,
  TimeseriesOptions,
  UsageBreakdown,
  UsageFilters,
  UsageGranularity,
  UsageReconciliation,
  UsageScope,
  UsageSummary,
  UsageTimeseries,
} from '../models/usage.models';

type ParamValue = string | number | boolean | null | undefined;

const SCOPE_BASES: Record<UsageScope, () => string> = {
  publisher: () => `${environment.ADMIN_API_BASE_URL}/usage`,
  admin: () => `${environment.ADMIN_API_BASE_URL}/admin/usage`,
  developer: () => `${environment.API_BASE_URL}/developers/usage`,
};

function toParams(...sources: Record<string, ParamValue>[]): HttpParams {
  let params = new HttpParams();
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }
  }
  return params;
}

/** Usage reports for the publisher portal, the Itqan admin, developers and the gallery. */
@Injectable({ providedIn: 'root' })
export class UsageApiService {
  private readonly http = inject(HttpClient);

  summary(scope: UsageScope, filters: UsageFilters): Observable<UsageSummary> {
    return this.http.get<UsageSummary>(`${SCOPE_BASES[scope]()}/summary/`, {
      params: toParams({ ...filters }),
    });
  }

  timeseries(
    scope: UsageScope,
    filters: UsageFilters,
    options: TimeseriesOptions
  ): Observable<UsageTimeseries> {
    const { compare, ...rest } = options;
    return this.http.get<UsageTimeseries>(`${SCOPE_BASES[scope]()}/timeseries/`, {
      params: toParams({ ...filters }, { ...rest, compare: compare ? 'previous_period' : null }),
    });
  }

  breakdown(
    scope: UsageScope,
    filters: UsageFilters,
    options: BreakdownOptions
  ): Observable<UsageBreakdown> {
    const { compare, ...rest } = options;
    return this.http.get<UsageBreakdown>(`${SCOPE_BASES[scope]()}/breakdown/`, {
      params: toParams({ ...filters }, { ...rest, compare: compare ? 'previous_period' : null }),
    });
  }

  /** Itqan admin: top publishers or assets with their previous-period values. */
  leaderboard(
    filters: UsageFilters,
    options: Pick<BreakdownOptions, 'metric' | 'limit'> & { by: 'publisher' | 'asset' }
  ): Observable<UsageBreakdown> {
    return this.http.get<UsageBreakdown>(`${SCOPE_BASES.admin()}/leaderboard/`, {
      params: toParams({ ...filters }, { ...options }),
    });
  }

  /** Itqan admin: R2 reads the edge never saw. */
  reconciliation(filters: UsageFilters, limit = 20): Observable<UsageReconciliation> {
    const { start_date, end_date, publisher_id } = filters;
    return this.http.get<UsageReconciliation>(`${SCOPE_BASES.admin()}/reconciliation/`, {
      params: toParams({ start_date, end_date, publisher_id, limit }),
    });
  }

  exportCsv(
    scope: UsageScope,
    filters: UsageFilters,
    granularity: UsageGranularity = 'day'
  ): Observable<Blob> {
    return this.http.get(`${SCOPE_BASES[scope]()}/export/`, {
      params: toParams({ ...filters }, { granularity }),
      responseType: 'blob',
    });
  }

  /** Gallery counts; `null` while the backend keeps them turned off (404). */
  publicCounts(assetId: number): Observable<PublicUsageCounts | null> {
    return this.http
      .get<PublicUsageCounts>(`${environment.API_BASE_URL}/assets/${assetId}/usage-counts/`)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 404 ? of(null) : throwError(() => error)
        )
      );
  }
}
