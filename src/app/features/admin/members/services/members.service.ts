import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { callerShowsErrors } from '../../../../core/interceptors/caller-shows-errors.context';
import { environment } from '../../../../../environments/environment';
import {
  MemberInviteIn,
  MemberListFilters,
  MemberOut,
  MemberUpdateIn,
  PagedMemberOut,
} from '../models/members.models';

/** `languages` is optional on older/partial API responses; normalize it so
 *  consumers can read `.length` without guarding every call site. */
function withLanguages(member: MemberOut): MemberOut {
  return member.languages ? member : { ...member, languages: [] };
}

@Injectable({
  providedIn: 'root',
})
export class MembersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.ADMIN_API_BASE_URL}/members`;

  list(filters: MemberListFilters): Observable<PagedMemberOut> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('page_size', String(filters.page_size));

    if (filters.ordering) {
      params = params.set('ordering', filters.ordering);
    }
    if (filters.publisher_id != null) {
      params = params.set('publisher_id', String(filters.publisher_id));
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.search) {
      params = params.set('search', filters.search);
    }

    return this.http
      .get<PagedMemberOut>(`${this.baseUrl}/`, { params })
      .pipe(map((res) => ({ ...res, results: res.results.map(withLanguages) })));
  }

  get(id: number): Observable<MemberOut> {
    return this.http.get<MemberOut>(`${this.baseUrl}/${id}/`).pipe(map(withLanguages));
  }

  invite(body: MemberInviteIn): Observable<MemberOut> {
    return this.http.post<MemberOut>(`${this.baseUrl}/`, body, { context: callerShowsErrors() });
  }

  update(id: number, body: MemberUpdateIn): Observable<MemberOut> {
    return this.http.patch<MemberOut>(`${this.baseUrl}/${id}/`, body, {
      context: callerShowsErrors(),
    });
  }

  /** Replace the languages this member works in (editing and reviewing alike). */
  setMemberLanguages(id: number, languages: string[]): Observable<MemberOut> {
    return this.http.put<MemberOut>(
      `${this.baseUrl}/${id}/languages/`,
      { languages },
      { context: callerShowsErrors() }
    );
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/`, { context: callerShowsErrors() });
  }

  resend(id: number): Observable<MemberOut> {
    return this.http.post<MemberOut>(
      `${this.baseUrl}/${id}/resend-invite/`,
      {},
      { context: callerShowsErrors() }
    );
  }

  acceptInvitation(token: string): Observable<unknown> {
    return this.http.post(
      `${environment.ADMIN_API_BASE_URL}/invitations/${encodeURIComponent(token)}/accept/`,
      {}
    );
  }
}
