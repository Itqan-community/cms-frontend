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
  createDraft(kind: AssetVersionParentKind, slug: string): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(`${this.draftBase(kind, slug)}draft/`, {});
  }

  /** Load a page of per-ayah entries for a version. */
  getEntries(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    page: number,
    pageSize: number
  ): Observable<ContentEntriesResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    return this.http.get<ContentEntriesResponse>(
      `${this.versionBase(kind, slug, versionId)}entries/`,
      { params }
    );
  }

  /** Autosave dirty rows into the draft. */
  patchEntries(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    rows: ContentEntryPatch[]
  ): Observable<ContentEntry[]> {
    return this.http.patch<ContentEntry[]>(`${this.versionBase(kind, slug, versionId)}entries/`, {
      rows,
    });
  }

  /** Publish the draft: it becomes the latest published version. */
  publish(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    body: { name?: string; summary?: string } = {}
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(
      `${this.versionBase(kind, slug, versionId)}publish/`,
      body
    );
  }

  /** Discard the draft and all its unsaved entries. */
  discardDraft(kind: AssetVersionParentKind, slug: string, versionId: number): Observable<void> {
    return this.http.delete<void>(this.versionBase(kind, slug, versionId));
  }

  /** Download a version's content as a CSV blob (auth token added by interceptor). */
  exportVersion(kind: AssetVersionParentKind, slug: string, versionId: number): Observable<Blob> {
    return this.http.get(`${this.versionBase(kind, slug, versionId)}export/`, {
      responseType: 'blob',
    });
  }

  private segment(kind: AssetVersionParentKind): string {
    return kind === 'tafsir' ? 'tafsirs' : 'translations';
  }

  private draftBase(kind: AssetVersionParentKind, slug: string): string {
    return `${this.base}/content/${this.segment(kind)}/${encodeURIComponent(slug)}/`;
  }

  private versionBase(kind: AssetVersionParentKind, slug: string, versionId: number): string {
    return `${this.draftBase(kind, slug)}versions/${versionId}/`;
  }
}
