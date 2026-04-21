import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsageService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.ADMIN_API_BASE_URL}/usage`;

  getBoardUrl(): Observable<{ board_url: string | null }> {
    return this.http.get<{ board_url: string | null }>(`${this.base}/board-url/`);
  }
}
