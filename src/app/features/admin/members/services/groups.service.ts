import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { GroupListFilters, PagedGroupListOut } from '../models/groups.models';

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.ADMIN_API_BASE_URL}/groups`;

  list(filters: GroupListFilters = {}): Observable<PagedGroupListOut> {
    let params = new HttpParams();
    if (filters.page != null) {
      params = params.set('page', String(filters.page));
    }
    if (filters.page_size != null) {
      params = params.set('page_size', String(filters.page_size));
    }
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.ordering) {
      params = params.set('ordering', filters.ordering);
    }
    if (filters.name) {
      params = params.set('name', filters.name);
    }
    return this.http.get<PagedGroupListOut>(`${this.baseUrl}/`, { params });
  }
}
