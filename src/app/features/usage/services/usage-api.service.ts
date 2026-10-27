import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BreakdownOptions,
  CoverageOptions,
  PublicUsageCounts,
  TimeseriesOptions,
  UsageBreakdown,
  UsageCohorts,
  UsageFilters,
  UsageFirstSeen,
  UsageGranularity,
  UsageListeners,
  UsageReconciliation,
  UsageRecitationCoverage,
  UsageScope,
  UsageSearchTerms,
  UsageSummary,
  UsageTimeseries,
} from '../models/usage.models';

/** Recitation reports exist for the publisher and admin scopes only. */
type PortalScope = Exclude<UsageScope, 'developer'>;

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

  /** New, returning and cumulative listeners (within event retention). */
  listeners(
    scope: PortalScope,
    filters: UsageFilters,
    granularity: Exclude<UsageGranularity, 'hour'>
  ): Observable<UsageListeners> {
    return this.http.get<UsageListeners>(`${SCOPE_BASES[scope]()}/listeners/`, {
      params: toParams({ ...filters }, { granularity }),
    });
  }

  /** Weekly listener cohorts (ranges up to 182 days). */
  cohorts(scope: PortalScope, filters: UsageFilters): Observable<UsageCohorts> {
    return this.http.get<UsageCohorts>(`${SCOPE_BASES[scope]()}/cohorts/`, {
      params: toParams({ ...filters }),
    });
  }

  /** When each country or app first played the content, newest first. */
  firstSeen(
    scope: PortalScope,
    filters: UsageFilters,
    by: 'country' | 'app',
    limit = 20
  ): Observable<UsageFirstSeen> {
    return this.http.get<UsageFirstSeen>(`${SCOPE_BASES[scope]()}/first-seen/`, {
      params: toParams({ ...filters }, { by, limit }),
    });
  }

  /** Gallery search terms of every visitor (only the dates apply). */
  searchTerms(
    scope: PortalScope,
    filters: Pick<UsageFilters, 'start_date' | 'end_date'>,
    zeroResults: boolean,
    limit = 20
  ): Observable<UsageSearchTerms> {
    const { start_date, end_date } = filters;
    return this.http.get<UsageSearchTerms>(`${SCOPE_BASES[scope]()}/search-terms/`, {
      params: toParams({ start_date, end_date, zero_results: zeroResults, limit }),
    });
  }

  /** Recitations missing surahs; admin requests can be limited to one publisher. */
  recitationCoverage(
    scope: PortalScope,
    options: CoverageOptions & { publisher_id?: number | null }
  ): Observable<UsageRecitationCoverage> {
    return this.http.get<UsageRecitationCoverage>(`${SCOPE_BASES[scope]()}/recitation-coverage/`, {
      params: toParams({ ...options }),
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
