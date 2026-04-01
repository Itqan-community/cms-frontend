import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Observable, of, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { Reciter, ReciterCreate, RecitersResponse, RecitersStats } from '../models/reciter.model';

const MOCK_STATS: RecitersStats = {
  total_reciters: 6,
  total_contemporary: 4,
  total_nationalities: 3,
  isMock: true,
};

@Injectable({
  providedIn: 'root',
})
export class RecitersService {
  private readonly http = inject(HttpClient);
  private readonly messages = inject(NzMessageService);
  private readonly BASE_URL = environment.API_BASE_URL;

  getReciters(search = '', page = 1, pageSize = 12): Observable<RecitersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<RecitersResponse>(`${this.BASE_URL}/reciters/`, { params });
  }

  createReciter(data: ReciterCreate): Observable<Reciter> {
    return this.http.post<Reciter>(`${this.BASE_URL}/reciters/`, data);
  }

  getStats(): Observable<RecitersStats> {
    return this.http
      .get<RecitersResponse>(`${this.BASE_URL}/reciters/`, {
        params: { page_size: '1' },
      })
      .pipe(
        map((r) => ({
          total_reciters: r.count,
          total_contemporary: 0,
          total_nationalities: 0,
        })),
        catchError(() => {
          this.messages.error('تعذر تحميل إحصائيات القرّاء، يتم عرض بيانات تجريبية مؤقتًا.');
          return of(MOCK_STATS);
        })
      );
  }
}
