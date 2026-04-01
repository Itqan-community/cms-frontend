import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  Publisher,
  PublisherFilters,
  PublishersListResponse,
} from '../models/publishers-stats.models';

@Injectable({
  providedIn: 'root',
})
export class PublishersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.ADMIN_API_BASE_URL}/publishers/`;

  getPublishers(params: PublisherFilters): Observable<PublishersListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('page_size', params.page_size.toString());

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.country) {
      httpParams = httpParams.set('country', params.country);
    }
    if (params.is_verified !== undefined) {
      httpParams = httpParams.set('is_verified', params.is_verified.toString());
    }

    return this.http.get<PublishersListResponse>(this.apiUrl, { params: httpParams });
  }

  getPublisher(id: number): Observable<Publisher> {
    return this.http.get<Publisher>(`${this.apiUrl}${id}/`);
  }

  createPublisher(publisher: Partial<Publisher>): Observable<Publisher> {
    return this.http.post<Publisher>(this.apiUrl, publisher);
  }

  updatePublisher(id: number, publisher: Partial<Publisher>): Observable<Publisher> {
    return this.http.patch<Publisher>(`${this.apiUrl}${id}/`, publisher);
  }

  deletePublisher(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
