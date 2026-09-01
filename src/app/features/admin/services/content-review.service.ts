import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { AssetContentLanguageKind } from '../models/asset-language-instance.models';
import type {
  ContentDiffEntryOut,
  ContentDiffResponse,
  ContentRowComment,
  ContentVersionState,
} from '../models/content-review.models';
import type { ContentDraftVersion } from '../models/asset-content.models';
import {
  mockAddRowComment,
  mockApplyApprovalsToDiff,
  mockApproveRow,
  mockListRowComments,
} from './content-review.mock-store';

@Injectable({ providedIn: 'root' })
export class ContentReviewService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.ADMIN_API_BASE_URL;

  submitForReview(
    kind: AssetContentLanguageKind,
    slug: string,
    versionId: number,
    langSlug?: string
  ): Observable<ContentDraftVersion> {
    if (!environment.contentReviewWorkflow) {
      return of({
        id: versionId,
        asset_id: 0,
        name: '',
        summary: '',
        state: 'ready_for_review' as ContentVersionState,
        entries_count: 0,
        created_at: new Date().toISOString(),
      });
    }
    return this.http.post<ContentDraftVersion>(
      `${this.versionBase(kind, slug, versionId, langSlug)}submit-review/`,
      {}
    );
  }

  getDiff(
    kind: AssetContentLanguageKind,
    slug: string,
    versionId: number,
    baseVersionId: number,
    langSlug?: string
  ): Observable<ContentDiffResponse> {
    if (!environment.contentReviewWorkflow) {
      return of({
        version_id: versionId,
        base_version_id: baseVersionId,
        state: 'ready_for_review',
        results: [],
        count: 0,
      });
    }
    const params = new HttpParams().set('base', baseVersionId.toString());
    return this.http.get<ContentDiffResponse>(
      `${this.versionBase(kind, slug, versionId, langSlug)}diff/`,
      { params }
    );
  }

  approveRow(
    kind: AssetContentLanguageKind,
    slug: string,
    versionId: number,
    rowKey: string,
    langSlug?: string
  ): Observable<void> {
    if (!environment.contentReviewWorkflow) {
      mockApproveRow(versionId, rowKey);
      return of(undefined);
    }
    return this.http.post<void>(
      `${this.versionBase(kind, slug, versionId, langSlug)}rows/${encodeURIComponent(rowKey)}/approve/`,
      {}
    );
  }

  listComments(
    kind: AssetContentLanguageKind,
    slug: string,
    versionId: number,
    rowKey: string,
    langSlug?: string
  ): Observable<ContentRowComment[]> {
    if (!environment.contentReviewWorkflow) {
      return of(mockListRowComments(versionId, rowKey));
    }
    return this.http.get<ContentRowComment[]>(
      `${this.versionBase(kind, slug, versionId, langSlug)}rows/${encodeURIComponent(rowKey)}/comments/`
    );
  }

  addComment(
    kind: AssetContentLanguageKind,
    slug: string,
    versionId: number,
    rowKey: string,
    body: string,
    langSlug?: string
  ): Observable<ContentRowComment> {
    if (!environment.contentReviewWorkflow) {
      return of(mockAddRowComment(versionId, rowKey, body));
    }
    return this.http.post<ContentRowComment>(
      `${this.versionBase(kind, slug, versionId, langSlug)}rows/${encodeURIComponent(rowKey)}/comments/`,
      { body }
    );
  }

  /** Enrich client-computed diff rows with mock approval/comment state when flag is off. */
  enrichDiffRows(versionId: number, rows: ContentDiffEntryOut[]): ContentDiffEntryOut[] {
    if (environment.contentReviewWorkflow) return rows;
    return mockApplyApprovalsToDiff(versionId, rows);
  }

  private versionBase(
    kind: AssetContentLanguageKind,
    slug: string,
    versionId: number,
    langSlug?: string
  ): string {
    const segment = kind === 'tafsir' ? 'tafsirs' : 'translations';
    const langPrefix = langSlug
      ? `${this.base}/content/${segment}/${encodeURIComponent(slug)}/languages/${encodeURIComponent(langSlug)}/`
      : `${this.base}/content/${segment}/${encodeURIComponent(slug)}/`;
    return `${langPrefix}versions/${versionId}/`;
  }
}
