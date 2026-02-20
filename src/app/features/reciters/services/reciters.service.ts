import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateReciterRequest, Reciter } from '../models/reciter.model';

@Injectable({
  providedIn: 'root',
})
export class RecitersService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  createReciter(data: CreateReciterRequest): Observable<Reciter> {
    return this.http.post<Reciter>(`${this.BASE_URL}/reciters/`, data);
  }
}
