import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Publisher } from '../models/publishers-stats.models';

@Injectable({
  providedIn: 'root',
})
export class PublishersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.API_BASE_URL}/portal/publishers/`;

  getPublishers(params: {
    page: number;
    limit: number;
    search?: string;
    is_active?: boolean;
  }): Observable<Publisher[]> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('limit', params.limit.toString());

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params.is_active !== undefined) {
      httpParams = httpParams.set('is_active', params.is_active.toString());
    }

    return this.http.get<Publisher[]>(this.apiUrl, { params: httpParams });
  }

  createPublisher(publisher: Partial<Publisher>): Observable<Publisher> {
    return this.http.post<Publisher>(this.apiUrl, publisher);
  }

  getPublisherById(id: string): Observable<Publisher> {
    return this.http.get<Publisher>(`${this.apiUrl}${id}`);
  }

  updatePublisher(id: string, publisher: Partial<Publisher>): Observable<Publisher> {
    const url = `${this.apiUrl}${id}`;

    return this.http.put<Publisher>(url, publisher).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 405 || error.status === 501) {
          return this.http.patch<Publisher>(url, publisher);
        }

        return throwError(() => error);
      })
    );
  }

  deletePublisher(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}`);
  }
}
