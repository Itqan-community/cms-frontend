import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { callerShowsErrors } from '../../../../core/interceptors/caller-shows-errors.context';
import { environment } from '../../../../../environments/environment';
import {
  GroupDetailOut,
  GroupListFilters,
  GroupNamesIn,
  PagedGroupListOut,
  PermissionGroupOut,
} from '../models/groups.models';

/** Callers (roles page, members role picker) show their own error messages for every call. */
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
    return this.http.get<PagedGroupListOut>(`${this.baseUrl}/`, {
      params,
      context: callerShowsErrors(),
    });
  }

  get(id: number): Observable<GroupDetailOut> {
    return this.http.get<GroupDetailOut>(`${this.baseUrl}/${id}/`, {
      context: callerShowsErrors(),
    });
  }

  create(names: GroupNamesIn): Observable<GroupDetailOut> {
    return this.http.post<GroupDetailOut>(`${this.baseUrl}/`, names, {
      context: callerShowsErrors(),
    });
  }

  update(id: number, names: GroupNamesIn): Observable<GroupDetailOut> {
    return this.http.put<GroupDetailOut>(`${this.baseUrl}/${id}/`, names, {
      context: callerShowsErrors(),
    });
  }

  /** Replaces the role's permissions; the backend adds the ones they imply (e.g. CREATE → READ). */
  setPermissions(id: number, permissions: string[]): Observable<GroupDetailOut> {
    return this.http.put<GroupDetailOut>(
      `${this.baseUrl}/${id}/permissions/`,
      { permissions },
      { context: callerShowsErrors() }
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/`, {
      context: callerShowsErrors(),
    });
  }

  /** Every permission a role can hold, grouped by usage and named in the UI language. */
  listPermissions(): Observable<PermissionGroupOut[]> {
    return this.http.get<PermissionGroupOut[]>(`${this.baseUrl}/permissions/`, {
      context: callerShowsErrors(),
    });
  }
}
