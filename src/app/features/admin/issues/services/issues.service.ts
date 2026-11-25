import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { callerShowsErrors } from '../../../../core/interceptors/caller-shows-errors.context';
import { SKIP_TENANT_HEADER } from '../../../../core/interceptors/tenant-header.interceptor';
import {
  IssueReportComment,
  IssueReportCommentIn,
  IssueReportCreateIn,
  IssueReportListFilters,
  IssueReportOut,
  IssueReportUpdateIn,
  PagedIssueReportAssets,
  PagedIssueReportOut,
} from '../models/issues.models';

@Injectable({
  providedIn: 'root',
})
export class IssuesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.ADMIN_API_BASE_URL}/issue-reports`;

  list(filters: IssueReportListFilters): Observable<PagedIssueReportOut> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('page_size', String(filters.page_size));

    if (filters.ordering) {
      params = params.set('ordering', filters.ordering);
    }
    if (filters.reporter_id != null) {
      params = params.set('reporter_id', String(filters.reporter_id));
    }
    if (filters.status?.length) {
      for (const s of filters.status) {
        params = params.append('status', s);
      }
    }

    return this.http.get<PagedIssueReportOut>(`${this.baseUrl}/`, { params });
  }

  /** The selected publisher's assets (X-Tenant) a report can be filed against, searched by name. */
  searchAssets(search: string): Observable<PagedIssueReportAssets> {
    let params = new HttpParams().set('page_size', '20');
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PagedIssueReportAssets>(
      `${environment.ADMIN_API_BASE_URL}/issue-report-assets/`,
      { params }
    );
  }

  get(id: number): Observable<IssueReportOut> {
    return this.http.get<IssueReportOut>(`${this.baseUrl}/${id}/`);
  }

  /**
   * File a report. The portal form sends X-Tenant, so the backend allows only the selected
   * publisher's assets; the gallery passes `fromGallery` to send none and report any asset.
   */
  create(body: IssueReportCreateIn, { fromGallery = false } = {}): Observable<IssueReportOut> {
    // Callers show the backend's message (e.g. an invalid issue location) themselves.
    return this.http.post<IssueReportOut>(`${this.baseUrl}/`, body, {
      context: callerShowsErrors().set(SKIP_TENANT_HEADER, fromGallery),
    });
  }

  patch(id: number, body: IssueReportUpdateIn): Observable<IssueReportOut> {
    return this.http.patch<IssueReportOut>(`${this.baseUrl}/${id}/`, body, {
      context: callerShowsErrors(),
    });
  }

  /** The report's comment thread, oldest first. The caller shows a failure inline. */
  listComments(id: number): Observable<IssueReportComment[]> {
    return this.http.get<IssueReportComment[]>(`${this.baseUrl}/${id}/comments/`, {
      context: callerShowsErrors(),
    });
  }

  /** Add a comment; the backend emails it to the reporter. */
  addComment(id: number, body: IssueReportCommentIn): Observable<IssueReportComment> {
    return this.http.post<IssueReportComment>(`${this.baseUrl}/${id}/comments/`, body, {
      context: callerShowsErrors(),
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/`);
  }
}
