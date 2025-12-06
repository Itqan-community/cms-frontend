import { HttpClient } from '@angular/common/http';
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
   * @description Get assets list, filtered by categories, search query and licenses
   * @example
   * this.assetsService.getAssets(categories, searchQuery, licenses).subscribe((assets) => {
   *   console.log(assets.results);
   * });
   */
  getAssets(categories: string[], searchQuery: string, licenses: string[]) {
    let params = {};

    if (categories && categories.length > 0) {
      params = { ...params, category: categories };
    }

    if (searchQuery && searchQuery.trim() !== '') {
      params = { ...params, search: searchQuery };
    }

    if (licenses && licenses.length > 0) {
      params = { ...params, license_code: licenses };
    }

    return this.http.get<ApiAssets>(`${this.BASE_URL}/assets/`, { params: params });
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
