import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  IssueReportCreateIn,
  IssueReportListFilters,
  IssueReportOut,
  IssueReportUpdateIn,
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

  get(id: number): Observable<IssueReportOut> {
    return this.http.get<IssueReportOut>(`${this.baseUrl}/${id}/`);
  }

  create(body: IssueReportCreateIn): Observable<IssueReportOut> {
    return this.http.post<IssueReportOut>(`${this.baseUrl}/`, body);
  }

  patch(id: number, body: IssueReportUpdateIn): Observable<IssueReportOut> {
    return this.http.patch<IssueReportOut>(`${this.baseUrl}/${id}/`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/`);
  }
}
