import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsageService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.ADMIN_API_BASE_URL}/usage`;

  getBoardUrl(publisherId?: number | null): Observable<{ board_url: string | null }> {
    let params = new HttpParams();
    if (publisherId != null) {
      params = params.set('publisher_id', publisherId.toString());
    }
    return this.http.get<{ board_url: string | null }>(`${this.base}/board-url/`, { params });
  }
}
