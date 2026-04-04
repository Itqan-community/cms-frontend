import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  Publisher,
  PublisherFilters,
  PublisherUpdatePayload,
  PublishersListResponse,
} from '../models/publishers-stats.models';

/** Set true only when backend detail/list APIs are unavailable locally; must be false before PR. */
const USE_PUBLISHER_API_MOCK = false;

function mockPublisher(id: number): Publisher {
  return {
    id,
    name: 'Mock Publisher',
    slug: `mock-publisher-${id}`,
    name_ar: 'ناشر تجريبي',
    name_en: 'Mock Publisher',
    description: 'وصف مختصر للناشر التجريبي.',
    country: 'المملكة العربية السعودية',
    website: 'https://example.com',
    contact_email: 'info@example.com',
    is_verified: true,
    foundation_year: 2020,
    address: 'الرياض',
    icon_url: undefined,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-06-01T12:00:00Z',
  };
}

@Injectable({
  providedIn: 'root',
})
export class PublishersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/publishers/`;

  getPublishers(params: PublisherFilters): Observable<PublishersListResponse> {
    if (USE_PUBLISHER_API_MOCK) {
      const all = [mockPublisher(1), mockPublisher(2), mockPublisher(3)];
      return of({ results: all, count: all.length }).pipe(delay(200));
    }

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
    if (params.ordering) {
      httpParams = httpParams.set('ordering', params.ordering);
    }

    return this.http.get<PublishersListResponse>(this.apiUrl, { params: httpParams });
  }

  getDetail(id: number): Observable<Publisher> {
    if (USE_PUBLISHER_API_MOCK) {
      return of(mockPublisher(id)).pipe(delay(200));
    }
    return this.http.get<Publisher>(`${this.apiUrl}${id}/`);
  }

  /** @deprecated Use getDetail */
  getPublisher(id: number): Observable<Publisher> {
    return this.getDetail(id);
  }

  createPublisher(body: Partial<Publisher>): Observable<Publisher> {
    if (USE_PUBLISHER_API_MOCK) {
      return of({ ...mockPublisher(99), ...body, id: 99 } as Publisher).pipe(delay(200));
    }
    return this.http.post<Publisher>(this.apiUrl, body);
  }

  updatePublisher(id: number, body: PublisherUpdatePayload): Observable<Publisher> {
    if (USE_PUBLISHER_API_MOCK) {
      return of({ ...mockPublisher(id), ...body }).pipe(delay(200));
    }
    return this.http.patch<Publisher>(`${this.apiUrl}${id}/`, body);
  }

  deletePublisher(id: number): Observable<void> {
    if (USE_PUBLISHER_API_MOCK) {
      return of(undefined).pipe(delay(200));
    }
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
