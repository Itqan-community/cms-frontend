import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PublisherStatistics } from '../models/publishers-stats.models';

@Injectable({
  providedIn: 'root',
})
export class PublishersStatsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.ADMIN_API_BASE_URL}/publishers/stats/`;

  getStatistics(): Observable<PublisherStatistics> {
    return this.http.get<PublisherStatistics>(this.apiUrl);
  }
}
