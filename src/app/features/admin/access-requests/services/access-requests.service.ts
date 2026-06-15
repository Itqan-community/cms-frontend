import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AccessRequestDetailOut,
  AccessRequestListFilters,
  AccessRequestOut,
  AutoAcceptanceIn,
  AutoAcceptanceOut,
  PagedAccessRequestOut,
  RejectAccessRequestIn,
} from '../models/access-requests.models';

@Injectable({
  providedIn: 'root',
})
export class AccessRequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.ADMIN_API_BASE_URL}/access-requests`;

  list(filters: AccessRequestListFilters): Observable<PagedAccessRequestOut> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('page_size', String(filters.page_size));

    if (filters.ordering) {
      params = params.set('ordering', filters.ordering);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<PagedAccessRequestOut>(`${this.baseUrl}/`, { params });
  }

  get(id: number): Observable<AccessRequestDetailOut> {
    return this.http.get<AccessRequestDetailOut>(`${this.baseUrl}/${id}/`);
  }

  accept(id: number): Observable<AccessRequestOut> {
    return this.http.post<AccessRequestOut>(`${this.baseUrl}/${id}/accept/`, {});
  }

  reject(id: number, body: RejectAccessRequestIn): Observable<AccessRequestOut> {
    return this.http.post<AccessRequestOut>(`${this.baseUrl}/${id}/reject/`, body);
  }

  getAutoAcceptance(): Observable<AutoAcceptanceOut> {
    return this.http.get<AutoAcceptanceOut>(`${this.baseUrl}/auto-acceptance-toggle/`);
  }

  setAutoAcceptance(body: AutoAcceptanceIn): Observable<AutoAcceptanceOut> {
    return this.http.put<AutoAcceptanceOut>(`${this.baseUrl}/auto-acceptance-toggle/`, body);
  }
}
