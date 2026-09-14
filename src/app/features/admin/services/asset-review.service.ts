import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { AssetVersionParentKind } from '../models/asset-versions.models';
import type {
  ReviewChange,
  ReviewChangesResponse,
  ReviewState,
} from '../models/asset-review.models';

/**
 * Translation review: reviewers approve / comment / unreview each per-commit
 * change for languages assigned to them. Mirrors the portal
 * `/content/{category}/{slug}/review/…` surface. Read-only on content.
 */
@Injectable({ providedIn: 'root' })
export class AssetReviewService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.ADMIN_API_BASE_URL;

  private reviewBase(kind: AssetVersionParentKind, slug: string): string {
    const segment = kind === 'tafsir' ? 'tafsirs' : 'translations';
    return `${this.base}/content/${segment}/${encodeURIComponent(slug)}/review/`;
  }

  /** The caller's assigned languages that this asset provides. */
  listLanguages(kind: AssetVersionParentKind, slug: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.reviewBase(kind, slug)}languages/`);
  }

  /** Paginated changes for one (asset, language), optionally filtered by state. */
  listChanges(
    kind: AssetVersionParentKind,
    slug: string,
    language: string,
    page: number,
    pageSize: number,
    state?: ReviewState | null
  ): Observable<ReviewChangesResponse> {
    let params = new HttpParams()
      .set('language', language)
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    if (state) {
      params = params.set('state', state);
    }
    return this.http.get<ReviewChangesResponse>(`${this.reviewBase(kind, slug)}changes/`, {
      params,
    });
  }

  /** Set a change's review state (approved / commented / unreviewed). */
  setState(
    kind: AssetVersionParentKind,
    slug: string,
    changeId: number,
    state: ReviewState,
    comment?: string
  ): Observable<ReviewChange> {
    return this.http.patch<ReviewChange>(`${this.reviewBase(kind, slug)}changes/${changeId}/`, {
      state,
      comment: comment ?? '',
    });
  }
}
