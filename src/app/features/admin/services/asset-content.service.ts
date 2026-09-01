import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AssetVersionParentKind,
  ContentDraftVersion,
  ContentEntriesResponse,
  ContentEntry,
  ContentEntryPatch,
} from '../models/asset-content.models';

export interface ContentEntriesParams {
  page: number;
  page_size: number;
  /** Scope word-template loads to one surah once the API supports it. */
  sura?: number;
}

/**
 * Per-ayah content editing for translations & tafsirs. Mirrors the portal
 * `/content/{category}/{slug}/…` draft flow: get-or-create a draft, load/patch
 * its entries, then publish (save) or discard.
 */
@Injectable({ providedIn: 'root' })
export class AssetContentService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.ADMIN_API_BASE_URL;

  /** Get-or-create the asset's shared draft version, seeded from latest published. */
  createDraft(
    kind: AssetVersionParentKind,
    slug: string,
    langSlug?: string
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(`${this.draftBase(kind, slug, langSlug)}draft/`, {});
  }

  /** Load a page of per-ayah entries for a version. */
  getEntries(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    params: ContentEntriesParams,
    langSlug?: string
  ): Observable<ContentEntriesResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('page_size', params.page_size.toString());
    if (params.sura !== undefined) {
      httpParams = httpParams.set('sura', params.sura.toString());
    }
    return this.http.get<ContentEntriesResponse>(
      `${this.versionBase(kind, slug, versionId, langSlug)}entries/`,
      { params: httpParams }
    );
  }

  /** Autosave dirty rows into the draft. */
  patchEntries(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    rows: ContentEntryPatch[],
    langSlug?: string
  ): Observable<ContentEntry[]> {
    return this.http.patch<ContentEntry[]>(
      `${this.versionBase(kind, slug, versionId, langSlug)}entries/`,
      { rows }
    );
  }

  /** Publish the draft: it becomes the latest published version. */
  publish(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    body: { name?: string; summary?: string } = {},
    langSlug?: string
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(
      `${this.versionBase(kind, slug, versionId, langSlug)}publish/`,
      body
    );
  }

  /** Discard the draft and all its unsaved entries. */
  discardDraft(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    langSlug?: string
  ): Observable<void> {
    return this.http.delete<void>(this.versionBase(kind, slug, versionId, langSlug));
  }

  /** Download a version's content as a CSV blob (auth token added by interceptor). */
  exportVersion(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    langSlug?: string
  ): Observable<Blob> {
    return this.http.get(`${this.versionBase(kind, slug, versionId, langSlug)}export/`, {
      responseType: 'blob',
    });
  }

  private segment(kind: AssetVersionParentKind): string {
    return kind === 'tafsir' ? 'tafsirs' : 'translations';
  }

  private draftBase(kind: AssetVersionParentKind, slug: string, langSlug?: string): string {
    const segment = this.segment(kind);
    if (langSlug && environment.assetLanguageInstances) {
      return `${this.base}/content/${segment}/${encodeURIComponent(slug)}/languages/${encodeURIComponent(langSlug)}/`;
    }
    return `${this.base}/content/${segment}/${encodeURIComponent(slug)}/`;
  }

  private versionBase(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    langSlug?: string
  ): string {
    return `${this.draftBase(kind, slug, langSlug)}versions/${versionId}/`;
  }
}
