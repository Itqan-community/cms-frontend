import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiReciters } from '../models/reciter.model';

@Injectable({
  providedIn: 'root',
})
export class ReciterService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  getReciters(page: number, pageSize: number): Observable<ApiReciters> {
    return this.http.get<ApiReciters>(`${this.BASE_URL}/reciters/`, {
      params: { page, page_size: pageSize },
    });
  }
}
