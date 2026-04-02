import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { PublisherFilterItem, PublisherFilterResponse } from '../models/tafsirs.models';

const USE_MOCK = true;

const MOCK_PUBLISHERS: PublisherFilterItem[] = [
  { id: 1, name: 'مجمع الملك فهد' },
  { id: 2, name: 'دار السلام للنشر' },
  { id: 3, name: 'مركز تفسير للدراسات القرآنية' },
  { id: 4, name: 'رابطة العالم الإسلامي' },
  { id: 5, name: 'الجامعة الإسلامية بالمدينة' },
];

@Injectable({
  providedIn: 'root',
})
export class PublishersFilterService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/filters/publishers/`;

  search(query = '', page = 1): Observable<PublisherFilterResponse> {
    if (USE_MOCK) {
      const filtered = query
        ? MOCK_PUBLISHERS.filter((p) => p.name.includes(query))
        : MOCK_PUBLISHERS;
      return of({ results: filtered, count: filtered.length }).pipe(delay(300));
    }

    let params = new HttpParams().set('page', page.toString());
    if (query) {
      params = params.set('search', query);
    }
    return this.http.get<PublisherFilterResponse>(this.apiUrl, { params });
  }
}
