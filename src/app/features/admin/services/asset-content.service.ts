import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AssetLanguage,
  AssetTemplate,
  AssetVersionParentKind,
  ContentChange,
  ContentDraftVersion,
  ContentEntriesResponse,
  ContentEntry,
  ContentEntryPatch,
} from '../models/asset-content.models';

/**
 * Per-unit content editing for translations & tafsirs. The unit granularity
 * (surah, ayah, word, or page) is fixed by the asset's template. Mirrors the
 * portal `/content/{category}/{slug}/…` draft flow: get-or-create a draft,
 * load/patch its entries, then publish (save) or discard.
 */
@Injectable({ providedIn: 'root' })
export class AssetContentService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.ADMIN_API_BASE_URL;

  /** List the languages an asset provides content in (source first). */
  listLanguages(kind: AssetVersionParentKind, slug: string): Observable<AssetLanguage[]> {
    return this.http.get<AssetLanguage[]>(`${this.draftBase(kind, slug)}languages/`);
  }

  /** Add a translation language, optionally seeding it from an uploaded file. */
  addLanguage(
    kind: AssetVersionParentKind,
    slug: string,
    language: string,
    file?: File | null
  ): Observable<AssetLanguage> {
    const data = new FormData();
    data.append('language', language);
    if (file) {
      data.append('file', file);
    }
    return this.http.post<AssetLanguage>(`${this.draftBase(kind, slug)}languages/`, data);
  }

  /** Mark a language available (READY) or pending (DRAFT) to consumers. */
  setLanguageAvailability(
    kind: AssetVersionParentKind,
    slug: string,
    language: string,
    available: boolean
  ): Observable<AssetLanguage> {
    return this.http.patch<AssetLanguage>(
      `${this.draftBase(kind, slug)}languages/${encodeURIComponent(language)}/availability/`,
      { available }
    );
  }

  /** Get-or-create the shared draft for one language, seeded from its latest published. */
  createDraft(
    kind: AssetVersionParentKind,
    slug: string,
    language: string
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(`${this.draftBase(kind, slug)}draft/`, { language });
  }

  /** Load a page of per-unit entries for a version, optionally filtered to one surah. */
  getEntries(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    page: number,
    pageSize: number,
    filterModel?: Record<string, unknown>
  ): Observable<ContentEntriesResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    // The grid's AG Grid filter model, sent whole; the backend filters every
    // unit by it before paging, so `count` is the filtered total.
    if (filterModel && Object.keys(filterModel).length > 0) {
      params = params.set('filters', JSON.stringify(filterModel));
    }
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

  /** Commit the draft: publish it as a new version with a required message. */
  commit(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    message: string
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(
      `${this.versionBase(kind, slug, versionId)}publish/`,
      { message }
    );
  }

  /** The uncommitted diff of a draft vs the current head (change review). */
  pendingChanges(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number
  ): Observable<{ results: ContentChange[]; count: number }> {
    return this.http.get<{ results: ContentChange[]; count: number }>(
      `${this.versionBase(kind, slug, versionId)}pending-diff/`
    );
  }

  /** A commit's stored diff, paginated (history view). */
  versionDiff(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    page = 1,
    pageSize = 100
  ): Observable<{ results: ContentChange[]; count: number }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    return this.http.get<{ results: ContentChange[]; count: number }>(
      `${this.versionBase(kind, slug, versionId)}diff/`,
      { params }
    );
  }

  /** One version's name and language (any state). */
  getVersion(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number
  ): Observable<ContentDraftVersion> {
    return this.http.get<ContentDraftVersion>(this.versionBase(kind, slug, versionId));
  }

  /** Discard the draft and all its unsaved entries. */
  discardDraft(kind: AssetVersionParentKind, slug: string, versionId: number): Observable<void> {
    return this.http.delete<void>(this.versionBase(kind, slug, versionId));
  }

  /** Restore a version's content as a new committed version (the latest); it is reviewed and published separately. */
  restoreVersion(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(
      `${this.versionBase(kind, slug, versionId)}restore/`,
      {}
    );
  }

  /** Make a fully approved version the one consumers see for its language. */
  setPublishedVersion(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(
      `${this.versionBase(kind, slug, versionId)}set-published/`,
      {}
    );
  }

  /** Download a version's content as a CSV blob (auth token added by interceptor). */
  exportVersion(kind: AssetVersionParentKind, slug: string, versionId: number): Observable<Blob> {
    return this.http.get(`${this.versionBase(kind, slug, versionId)}export/`, {
      responseType: 'blob',
    });
  }

  /** An empty CSV to fill in for a template, before the asset exists (one row
   *  per surah / ayah / word / page, blank text). `page` needs the layout. */
  downloadCsvTemplate(
    kind: AssetVersionParentKind,
    template: AssetTemplate,
    mushafLayoutId?: number | null
  ): Observable<Blob> {
    let params = new HttpParams().set('template', template);
    if (mushafLayoutId != null) {
      params = params.set('mushaf_layout_id', mushafLayoutId);
    }
    return this.http.get(`${this.base}/content/${this.segment(kind)}/csv-template/`, {
      params,
      responseType: 'blob',
    });
  }

  /** An empty CSV to fill in for an existing asset's template. */
  downloadAssetCsvTemplate(kind: AssetVersionParentKind, slug: string): Observable<Blob> {
    return this.http.get(`${this.draftBase(kind, slug)}csv-template/`, { responseType: 'blob' });
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
