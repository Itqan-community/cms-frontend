import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PublisherFilterResponse } from '../models/tafsirs.models';

@Injectable({
  providedIn: 'root',
})
export class PublishersFilterService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/filters/publishers/`;

  search(query = '', page = 1): Observable<PublisherFilterResponse> {
    let params = new HttpParams().set('page', page.toString());
    if (query) {
      params = params.set('search', query);
    }
    return this.http.get<PublisherFilterResponse>(this.apiUrl, { params });
  }
}
