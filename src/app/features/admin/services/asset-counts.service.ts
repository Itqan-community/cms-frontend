import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { callerShowsErrors } from '../../../core/interceptors/caller-shows-errors.context';

export type CountedAssetCategory = 'text' | 'mushaf' | 'font' | 'recitation';

/** `total` includes the drafts. */
export interface AssetTagCount {
  slug: string;
  name: string;
  total: number;
  drafts: number;
}

export interface AssetCategoryCount {
  category: CountedAssetCategory;
  total: number;
  drafts: number;
  /** Text assets only: one entry per tag in use (an asset with two tags counts under both). */
  tags: AssetTagCount[];
}

export interface AssetCountsOut {
  /** Only the types whose portal list the user may open, for the selected publisher. */
  categories: AssetCategoryCount[];
}

/** Asset counts per type for the portal home (`GET /portal/asset-counts/`, cached a minute). */
@Injectable({ providedIn: 'root' })
export class AssetCountsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/asset-counts/`;

  /** The home shows the failure inline, so the global error toast stays quiet. */
  get(): Observable<AssetCountsOut> {
    return this.http.get<AssetCountsOut>(this.apiUrl, { context: callerShowsErrors() });
  }
}
