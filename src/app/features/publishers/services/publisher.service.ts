import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiAssets } from '../../../features/gallery/models/assets.model';

export interface Publisher {
  id: number;
  name: string;
  slug: string;
  description: string;
  address: string;
  website: string;
  is_verified: boolean;
  contact_email: string;
  icon_url: string;
}

@Injectable({
  providedIn: 'root',
})
export class PublisherService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  getPublisher(id: string): Observable<Publisher> {
    return this.http.get<Publisher>(`${this.BASE_URL}/publishers/${id}/`);
  }

  /**
   * Get assets for a specific publisher
   * @param publisherId {string} - Publisher ID to filter assets by
   * @param categories {string[]} - Filter by categories
   * @param searchQuery {string} - Search query string
   * @param licenses {string[]} - Filter by licenses
   * @returns {Observable<ApiAssets>}
   * @description Get assets list filtered by publisher_id, categories, search query and licenses
   * @example
   * this.publisherService.getPublisherAssets(publisherId, categories, searchQuery, licenses).subscribe((assets) => {
   *   console.log(assets.results);
   * });
   */
  getPublisherAssets(
    publisherId: string,
    categories: string[] = [],
    searchQuery = '',
    licenses: string[] = []
  ): Observable<ApiAssets> {
    let params = new HttpParams().set('publisher_id', publisherId);

    categories.forEach((category) => {
      params = params.append('category', category);
    });

    licenses.forEach((license) => {
      params = params.append('license_code', license);
    });

    if (searchQuery.trim()) {
      params = params.set('search', searchQuery.trim());
    }

    return this.http.get<ApiAssets>(`${this.BASE_URL}/assets/`, { params });
  }
}
