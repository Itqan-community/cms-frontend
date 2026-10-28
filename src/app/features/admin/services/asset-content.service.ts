import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AssetColumn,
  AssetLanguage,
  AssetTemplate,
  AssetVersionParentKind,
  ContentChange,
  ContentDraftVersion,
  ContentEntriesResponse,
  ContentEntry,
  ContentEntryPatch,
  QuranPosition,
  QuranRangeResponse,
} from '../models/asset-content.models';
import type { VersionBump } from '../models/asset-versions.models';
import type { VersionText } from '../utils/version-text.util';

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
    file?: File | null,
    version?: { label_en: string; label_ar: string; number: string }
  ): Observable<AssetLanguage> {
    const data = new FormData();
    data.append('language', language);
    if (file) {
      data.append('file', file);
      // The file becomes the language's first version, which starts its numbering.
      if (version) {
        data.append('version_label_en', version.label_en);
        data.append('version_label_ar', version.label_ar);
        data.append('version_number', version.number);
      }
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

  /** The asset's text columns, in file order. */
  listColumns(kind: AssetVersionParentKind, slug: string): Observable<AssetColumn[]> {
    return this.http.get<AssetColumn[]>(`${this.draftBase(kind, slug)}columns/`);
  }

  /** Add a text column at the end (needs the manage-columns permission). */
  createColumn(
    kind: AssetVersionParentKind,
    slug: string,
    body: { key: string; label_en: string; label_ar: string }
  ): Observable<AssetColumn> {
    return this.http.post<AssetColumn>(`${this.draftBase(kind, slug)}columns/`, body);
  }

  /** Change a column's labels, or its key while no committed version has it. */
  updateColumn(
    kind: AssetVersionParentKind,
    slug: string,
    key: string,
    body: Partial<{ key: string; label_en: string; label_ar: string }>
  ): Observable<AssetColumn> {
    return this.http.patch<AssetColumn>(`${this.columnUrl(kind, slug, key)}`, body);
  }

  /** Set the column order (every key, once). */
  reorderColumns(
    kind: AssetVersionParentKind,
    slug: string,
    keys: string[]
  ): Observable<AssetColumn[]> {
    return this.http.put<AssetColumn[]>(`${this.draftBase(kind, slug)}columns/order/`, { keys });
  }

  /** Delete a column no committed version contains. */
  deleteColumn(kind: AssetVersionParentKind, slug: string, key: string): Observable<void> {
    return this.http.delete<void>(this.columnUrl(kind, slug, key));
  }

  /** Get-or-create the shared draft for one language, seeded from its latest published.
   *  Without a language the server opens the source language's draft. */
  createDraft(
    kind: AssetVersionParentKind,
    slug: string,
    language?: string | null
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(
      `${this.draftBase(kind, slug)}draft/`,
      language ? { language } : {}
    );
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

  /** Add a group (a range with its first text) to a source-language draft. */
  addGroup(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    start: QuranPosition,
    end: QuranPosition,
    cells: Record<string, string>
  ): Observable<ContentEntry[]> {
    return this.http.post<ContentEntry[]>(`${this.versionBase(kind, slug, versionId)}groups/`, {
      start,
      end,
      cells,
    });
  }

  /** Give a draft's group a new range, keeping its text. */
  moveGroup(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    unitId: number,
    start: QuranPosition,
    end: QuranPosition
  ): Observable<ContentEntry[]> {
    return this.http.put<ContentEntry[]>(
      `${this.versionBase(kind, slug, versionId)}groups/${unitId}/`,
      { start, end }
    );
  }

  /** Add a blank one-ayah (or one-word) group right after the furthest unit the
   *  draft's groups reach — "add next group" under the grid. */
  appendGroup(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number
  ): Observable<ContentEntry[]> {
    return this.http.post<ContentEntry[]>(
      `${this.versionBase(kind, slug, versionId)}groups/next/`,
      {}
    );
  }

  /** Grow (1) or shrink (-1) a draft group's end by one ayah / word. */
  extendGroup(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    unitId: number,
    by: 1 | -1
  ): Observable<ContentEntry[]> {
    return this.http.post<ContentEntry[]>(
      `${this.versionBase(kind, slug, versionId)}groups/${unitId}/extend/`,
      { by }
    );
  }

  /** Delete a draft's group (every column). */
  deleteGroup(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    unitId: number
  ): Observable<void> {
    return this.http.delete<void>(`${this.versionBase(kind, slug, versionId)}groups/${unitId}/`);
  }

  /** The mushaf text of a range: its ayahs, or its words when both ends name a word. */
  quranRange(start: QuranPosition, end: QuranPosition): Observable<QuranRangeResponse> {
    let params = new HttpParams()
      .set('from_surah', start.surah)
      .set('from_ayah', start.ayah)
      .set('to_surah', end.surah)
      .set('to_ayah', end.ayah);
    if (start.word != null && end.word != null) {
      params = params.set('from_word', start.word).set('to_word', end.word);
    }
    return this.http.get<QuranRangeResponse>(`${this.base}/content/quran-range/`, { params });
  }

  /** Commit the draft: publish it as a new version with a required message. */
  commit(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    text: VersionText,
    numbering: { version_number?: string; bump: VersionBump }
  ): Observable<ContentDraftVersion> {
    // The summary is the commit message (at least one language); the name, if any.
    return this.http.post<ContentDraftVersion>(
      `${this.versionBase(kind, slug, versionId)}publish/`,
      { ...text, ...numbering }
    );
  }

  /** The uncommitted diff of a draft vs the current head (change review). */
  pendingChanges(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    pageSize?: number
  ): Observable<{ results: ContentChange[]; count: number }> {
    const params = pageSize ? new HttpParams().set('page_size', pageSize) : undefined;
    return this.http.get<{ results: ContentChange[]; count: number }>(
      `${this.versionBase(kind, slug, versionId)}pending-diff/`,
      { params }
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
    versionId: number,
    bump: VersionBump
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(
      `${this.versionBase(kind, slug, versionId)}restore/`,
      { bump }
    );
  }

  /** Make a fully approved version the one consumers see for its language. Going back to
   *  an earlier version needs a reason, which the itqan CLI shows to projects still on a newer one. */
  setPublishedVersion(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    reason = ''
  ): Observable<ContentDraftVersion> {
    return this.http.post<ContentDraftVersion>(
      `${this.versionBase(kind, slug, versionId)}set-published/`,
      { reason }
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

  private columnUrl(kind: AssetVersionParentKind, slug: string, key: string): string {
    return `${this.draftBase(kind, slug)}columns/${encodeURIComponent(key)}/`;
  }

  private versionBase(kind: AssetVersionParentKind, slug: string, versionId: number): string {
    return `${this.draftBase(kind, slug)}versions/${versionId}/`;
  }
}
