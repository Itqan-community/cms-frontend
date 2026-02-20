import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RecitationsStats } from '../models/recitation.model';

@Injectable({
  providedIn: 'root',
})
export class RecitationsService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  getRecitationsStats(): Observable<RecitationsStats> {
    return this.http.get<RecitationsStats>(`${this.BASE_URL}/recitations/stats/`);
  }
}
