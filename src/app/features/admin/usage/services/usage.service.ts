import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { MixpanelSegmentationResponse } from '../models/usage.models';

@Injectable({ providedIn: 'root' })
export class UsageService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.ADMIN_API_BASE_URL}/usage`;

  getTimeseries(
    from: string,
    to: string,
    publisherId: number | null,
  ): Observable<MixpanelSegmentationResponse> {
    let params = new HttpParams().set('from_date', from).set('to_date', to);
    if (publisherId != null) params = params.set('publisher_id', publisherId.toString());
    return this.http.get<MixpanelSegmentationResponse>(`${this.base}/timeseries/`, { params });
  }

  getTopEndpoints(
    from: string,
    to: string,
    publisherId: number | null,
  ): Observable<MixpanelSegmentationResponse> {
    let params = new HttpParams().set('from_date', from).set('to_date', to);
    if (publisherId != null) params = params.set('publisher_id', publisherId.toString());
    return this.http.get<MixpanelSegmentationResponse>(`${this.base}/top-endpoints/`, { params });
  }

  getTopEntities(
    from: string,
    to: string,
    publisherId: number | null,
  ): Observable<MixpanelSegmentationResponse> {
    let params = new HttpParams().set('from_date', from).set('to_date', to);
    if (publisherId != null) params = params.set('publisher_id', publisherId.toString());
    return this.http.get<MixpanelSegmentationResponse>(`${this.base}/top-entities/`, { params });
  }
}
