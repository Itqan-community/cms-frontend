import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiReciters, CreateReciterRequest, Reciter } from '../models/reciter.model';

@Injectable({
  providedIn: 'root',
})
export class RecitersService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  getReciters(ordering = 'name_ar', page = 1, pageSize = 10, search = ''): Observable<ApiReciters> {
    let params = new HttpParams()
      .set('ordering', ordering)
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiReciters>(`${this.BASE_URL}/reciters/`, { params });
  }

  createReciter(data: CreateReciterRequest): Observable<Reciter> {
    return this.http.post<Reciter>(`${this.BASE_URL}/reciters/`, data);
  }
}
