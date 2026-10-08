import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AssetVersion,
  AssetVersionFormPayload,
  AssetVersionParentKind,
  AssetVersionsListParams,
  AssetVersionsListResponse,
} from '../models/asset-versions.models';

@Injectable({ providedIn: 'root' })
export class AssetVersionsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.ADMIN_API_BASE_URL;

  list(
    kind: AssetVersionParentKind,
    slug: string,
    params: AssetVersionsListParams
  ): Observable<AssetVersionsListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('page_size', params.page_size.toString());
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.language) {
      httpParams = httpParams.set('language', params.language);
    }
    return this.http.get<AssetVersionsListResponse>(this.listUrl(kind, slug), {
      params: httpParams,
    });
  }

  /**
   * Load the complete version list for preview / diff.
   * Search is intentionally not passed because we need the real previous version from the full history.
   */
  listAll(
    kind: AssetVersionParentKind,
    slug: string,
    pageSize = 100
  ): Observable<AssetVersionsListResponse> {
    const effectivePageSize =
      Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 1000) : 100;

    const firstPageParams = new HttpParams()
      .set('page', '1')
      .set('page_size', effectivePageSize.toString());

    return this.http
      .get<AssetVersionsListResponse>(this.listUrl(kind, slug), {
        params: firstPageParams,
      })
      .pipe(
        switchMap((firstPage) => {
          const totalPages = Math.ceil(firstPage.count / effectivePageSize);

          if (totalPages <= 1) {
            return of(firstPage);
          }

          const remainingRequests = Array.from({ length: totalPages - 1 }, (_, index) => {
            const page = index + 2;
            const params = new HttpParams()
              .set('page', page.toString())
              .set('page_size', effectivePageSize.toString());

            return this.http.get<AssetVersionsListResponse>(this.listUrl(kind, slug), {
              params,
            });
          });

          return forkJoin(remainingRequests).pipe(
            map((responses) => ({
              results: [...firstPage.results, ...responses.flatMap((response) => response.results)],
              count: firstPage.count,
            }))
          );
        })
      );
  }

  /** The language's latest version number (translations/tafsirs); null when it has none. */
  latestNumber(
    kind: AssetVersionParentKind,
    slug: string,
    language: string
  ): Observable<string | null> {
    return this.list(kind, slug, { page: 1, page_size: 1, language }).pipe(
      map((res) => res.results[0]?.name ?? null)
    );
  }

  create(
    kind: AssetVersionParentKind,
    slug: string,
    payload: AssetVersionFormPayload
  ): Observable<AssetVersion> {
    return this.http.post<AssetVersion>(this.listUrl(kind, slug), this.toFormData(payload));
  }

  update(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    payload: AssetVersionFormPayload
  ): Observable<AssetVersion> {
    return this.http.patch<AssetVersion>(
      this.versionItemUrl(kind, slug, versionId),
      this.toFormData(payload)
    );
  }

  delete(kind: AssetVersionParentKind, slug: string, versionId: number): Observable<void> {
    return this.http.delete<void>(this.versionItemUrl(kind, slug, versionId));
  }

  private segmentForKind(kind: AssetVersionParentKind): string {
    switch (kind) {
      case 'tafsir':
        return 'tafsirs';
      case 'translation':
        return 'translations';
      case 'mushaf':
        return 'mushafs';
      case 'font':
        return 'fonts';
      case 'program':
        return 'programs';
      default: {
        const _exhaustive: never = kind;
        throw new Error(`Unsupported asset version kind: ${_exhaustive}`);
      }
    }
  }

  private listUrl(kind: AssetVersionParentKind, slug: string): string {
    const segment = this.segmentForKind(kind);
    return `${this.base}/${segment}/${encodeURIComponent(slug)}/versions/`;
  }

  private versionItemUrl(kind: AssetVersionParentKind, slug: string, versionId: number): string {
    const segment = this.segmentForKind(kind);
    return `${this.base}/${segment}/${encodeURIComponent(slug)}/versions/${versionId}/`;
  }

  private toFormData(payload: AssetVersionFormPayload): FormData {
    const data = new FormData();
    data.append('asset_id', String(payload.asset_id));
    if (payload.name !== undefined) {
      data.append('name', payload.name);
    }
    for (const key of ['label_en', 'label_ar', 'summary_en', 'summary_ar'] as const) {
      if (payload[key] !== undefined) {
        data.append(key, payload[key]);
      }
    }
    if (payload.version_number) {
      data.append('version_number', payload.version_number);
    }
    if (payload.bump) {
      data.append('bump', payload.bump);
    }
    if (payload.summary !== undefined) {
      data.append('summary', payload.summary);
    }
    if (payload.file) {
      data.append('file', payload.file);
    }
    if (payload.language) {
      data.append('language', payload.language);
    }
    if (payload.pre_approved) {
      data.append('pre_approved', 'true');
    }
    return data;
  }
}
