import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
    return this.http.get<AssetVersionsListResponse>(this.listUrl(kind, slug), {
      params: httpParams,
    });
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

  private listUrl(kind: AssetVersionParentKind, slug: string): string {
    const segment = kind === 'tafsir' ? 'tafsirs' : 'translations';
    return `${this.base}/${segment}/${encodeURIComponent(slug)}/versions/`;
  }

  private versionItemUrl(kind: AssetVersionParentKind, slug: string, versionId: number): string {
    const segment = kind === 'tafsir' ? 'tafsirs' : 'translations';
    return `${this.base}/${segment}/${encodeURIComponent(slug)}/versions/${versionId}/`;
  }

  private toFormData(payload: AssetVersionFormPayload): FormData {
    const data = new FormData();
    data.append('asset_id', String(payload.asset_id));
    data.append('name', payload.name);
    data.append('summary', payload.summary);
    if (payload.file) {
      data.append('file', payload.file);
    }
    return data;
  }
}
