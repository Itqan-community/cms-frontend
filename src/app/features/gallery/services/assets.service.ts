import { Categories, GALLERY_TEXT_TAGS } from '../../../core/enums/categories.enum';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import {
  ApiAssets,
  AssetDetails,
  AssetFileStructure,
  FontPreview,
  RecitationPreview,
} from '../models/assets.model';

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

    // Tafsir and translation are tags of the text category: send them as tags, plus the
    // text category once, so the backend lists them next to the other categories picked.
    const tags = (categories ?? []).filter((c) =>
      (GALLERY_TEXT_TAGS as readonly string[]).includes(c)
    );
    const others = (categories ?? []).filter((c) => !tags.includes(c));
    for (const c of tags.length ? [...others, Categories.TEXT] : others) {
      params = params.append('category', c);
    }
    for (const tag of tags) {
      params = params.append('tag', tag);
    }

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

  /** A translation's / tafsir's download layout and sample rows for one language
   *  (the source when ``language`` is null). */
  getFileStructure(id: number | string, language: string | null) {
    const params = language ? new HttpParams().set('language', language) : undefined;
    return this.http.get<AssetFileStructure>(`${this.BASE_URL}/assets/${id}/file-structure/`, {
      params,
    });
  }

  getRecitationPreview(id: number | string) {
    return this.http.get<RecitationPreview>(`${this.BASE_URL}/assets/${id}/recitation-preview/`);
  }

  getFontPreview(id: number | string, language: string | null) {
    const params = language ? new HttpParams().set('language', language) : undefined;
    return this.http.get<FontPreview>(`${this.BASE_URL}/assets/${id}/font-preview/`, { params });
  }
}
