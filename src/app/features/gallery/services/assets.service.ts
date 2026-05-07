import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiAssets, AssetDetails } from '../models/assets.model';

@Injectable({
  providedIn: 'root',
})
export class AssetsService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  /**
   * Get assets
   * @returns {Observable<ApiAssets>}
   * @description Get assets list, filtered by categories, search query, licenses and publisher
   * @example
   * this.assetsService.getAssets(categories, searchQuery, licenses, publisherId).subscribe((assets) => {
   *   console.log(assets.results);
   * });
   */
  getAssets(
    categories: string[],
    searchQuery: string,
    licenses: string[],
    publisherId?: number | null,
    page = 1,
    page_size = 12
  ) {
    let params = new HttpParams().set('page', String(page)).set('page_size', String(page_size));

    (categories ?? []).forEach((c) => {
      params = params.append('category', c);
    });

    (licenses ?? []).forEach((l) => {
      params = params.append('license_code', l);
    });

    if (searchQuery && searchQuery.trim() !== '') {
      params = params.set('search', searchQuery.trim());
    }

    if (publisherId) {
      params = params.set('publisher', String(publisherId));
    }

    return this.http.get<ApiAssets>(`${this.BASE_URL}/assets/`, { params });
  }

  /**
   * Get asset details
   * @param id {string}
   * @returns {Observable<AssetDetails>}
   * @description Get asset details by id
   * @example
   * this.assetsService.getAssetDetails(id).subscribe((asset) => {
   *   console.log(asset);
   * });
   */
  getAssetDetails(id: string) {
    return this.http.get<AssetDetails>(`${this.BASE_URL}/assets/${id}/`);
  }
}
