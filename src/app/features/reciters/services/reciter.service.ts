import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiAssets } from '../../gallery/models/assets.model';
import { ApiReciters, ReciterDetail } from '../models/reciter.model';

@Injectable({
  providedIn: 'root',
})
export class ReciterService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  /**
   * Get the public paginated list of reciters.
   * @param search {string} - Search query string
   * @param nationality {string} - Filter by 2-letter ISO nationality code
   * @returns {Observable<ApiReciters>}
   */
  getReciters(search = '', nationality = '', page = 1, page_size = 12): Observable<ApiReciters> {
    let params = new HttpParams().set('page', String(page)).set('page_size', String(page_size));

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    if (nationality.trim()) {
      params = params.set('nationality', nationality.trim());
    }

    return this.http.get<ApiReciters>(`${this.BASE_URL}/reciters/`, { params });
  }

  getReciter(slug: string): Observable<ReciterDetail> {
    return this.http.get<ReciterDetail>(`${this.BASE_URL}/reciters/${slug}/`);
  }

  /**
   * Get a reciter's recitation assets.
   * @param reciterId {number} - Reciter ID to filter assets by
   * @returns {Observable<ApiAssets>}
   */
  getReciterAssets(reciterId: number, page = 1, page_size = 12): Observable<ApiAssets> {
    const params = new HttpParams()
      .set('reciter_id', String(reciterId))
      .set('category', 'recitation')
      .set('page', String(page))
      .set('page_size', String(page_size));

    return this.http.get<ApiAssets>(`${this.BASE_URL}/assets/`, { params });
  }
}
