import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PublisherCreatePayload,
  Publisher,
  PublisherFilters,
  PublisherUpdatePayload,
  PublishersListResponse,
} from '../models/publishers-stats.models';

@Injectable({
  providedIn: 'root',
})
export class PublishersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/publishers/`;

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
    if (params.ordering) {
      httpParams = httpParams.set('ordering', params.ordering);
    }

    return this.http.get<PublishersListResponse>(this.apiUrl, { params: httpParams }).pipe(
      map((res) => ({
        ...res,
        results: res.results.map((publisher) => this.normalizePublisher(publisher)),
      }))
    );
  }

  getDetail(id: number): Observable<Publisher> {
    return this.http
      .get<Publisher & { icon_url?: string }>(`${this.apiUrl}${id}/`)
      .pipe(map((publisher) => this.normalizePublisher(publisher)));
  }

  /** @deprecated Use getDetail */
  getPublisher(id: number): Observable<Publisher> {
    return this.getDetail(id);
  }

  createPublisher(body: PublisherCreatePayload): Observable<Publisher> {
    return this.http
      .post<Publisher & { icon_url?: string }>(this.apiUrl, this.toFormData(body))
      .pipe(map((publisher) => this.normalizePublisher(publisher)));
  }

  updatePublisher(id: number, body: PublisherUpdatePayload): Observable<Publisher> {
    return this.http
      .patch<Publisher & { icon_url?: string }>(`${this.apiUrl}${id}/`, this.toFormData(body))
      .pipe(map((publisher) => this.normalizePublisher(publisher)));
  }

  deletePublisher(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  private toFormData(payload: PublisherCreatePayload | PublisherUpdatePayload): FormData {
    const data = new FormData();
    const appendString = (
      key: string,
      value: string | number | boolean | null | undefined
    ): void => {
      if (value === null || value === undefined || value === '') return;
      data.append(key, String(value));
    };

    appendString('name_ar', payload.name_ar);
    appendString('name_en', payload.name_en);
    appendString('description_ar', payload.description_ar);
    appendString('description_en', payload.description_en);
    appendString('address', payload.address);
    appendString('website', payload.website);
    appendString('contact_email', payload.contact_email);
    appendString('country', payload.country);
    if (payload.icon) {
      data.append('icon', payload.icon);
    }
    appendString('foundation_year', payload.foundation_year);
    if (payload.is_verified !== undefined) {
      data.append('is_verified', String(payload.is_verified));
    }

    return data;
  }

  private normalizePublisher(publisher: Publisher & { icon_url?: string }): Publisher {
    return {
      ...publisher,
      icon: publisher.icon ?? publisher.icon_url,
    };
  }
}
