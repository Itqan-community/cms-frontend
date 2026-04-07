import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { NATIONALITY } from '../nationality.enum';
import {
  ReciterDetails,
  ReciterFormValue,
  ReciterListFilters,
  ReciterListItem,
  RecitersListResponse,
} from '../models/reciters.models';

const USE_MOCK = true;

const MOCK_RECITERS: ReciterListItem[] = [
  {
    id: 1,
    name: 'عبد الباسط عبد الصمد',
    bio: 'من أعلام التلاوة في العصر الحديث',
    recitations_count: 12,
    nationality: NATIONALITY.EG,
    slug: 'abdul-basit',
    image_url: '',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-06-01T12:00:00Z',
    date_of_death: '',
  },
  {
    id: 2,
    name: 'محمد صديق المنشاوي',
    bio: '',
    recitations_count: 8,
    nationality: NATIONALITY.EG,
    slug: 'minshawi',
    image_url: '',
    created_at: '2024-02-12T08:00:00Z',
    updated_at: '2024-05-20T09:30:00Z',
    date_of_death: '1969-06-20',
  },
  {
    id: 3,
    name: 'مشاري راشد العفاسي',
    bio: 'إمام وخطيب وقارئ كويتي',
    recitations_count: 5,
    nationality: NATIONALITY.KW,
    slug: 'afasy',
    image_url: '',
    created_at: '2024-03-05T14:00:00Z',
    updated_at: '2024-04-10T11:00:00Z',
    date_of_death: '',
  },
];

const mockDetail = (id: number): ReciterDetails => {
  const row = MOCK_RECITERS.find((r) => r.id === id) ?? MOCK_RECITERS[0];
  return {
    id: row.id,
    name_ar: row.name,
    name_en: `Reciter ${row.id}`,
    bio_ar: row.bio || '—',
    bio_en: row.bio || '—',
    recitations_count: row.recitations_count,
    slug: row.slug,
    image_url: row.image_url,
    nationality: row.nationality,
    created_at: row.created_at,
    updated_at: row.updated_at,
    date_of_death: row.date_of_death,
  };
};

@Injectable({ providedIn: 'root' })
export class RecitersAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/reciters/`;

  getList(filters: ReciterListFilters): Observable<RecitersListResponse> {
    if (USE_MOCK) {
      let rows = [...MOCK_RECITERS];
      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        rows = rows.filter((r) => r.name.toLowerCase().includes(q));
      }
      if (filters.nationality) {
        rows = rows.filter((r) => r.nationality === filters.nationality);
      }
      return of({ results: rows, count: rows.length }).pipe(delay(400));
    }

    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('page_size', filters.page_size.toString());

    if (filters.search) params = params.set('search', filters.search);
    if (filters.nationality != null) params = params.set('nationality', filters.nationality);
    if (filters.ordering) params = params.set('ordering', filters.ordering);

    return this.http.get<RecitersListResponse>(this.apiUrl, { params });
  }

  getDetail(id: number): Observable<ReciterDetails> {
    if (USE_MOCK) {
      return of(mockDetail(id)).pipe(delay(350));
    }
    return this.http.get<ReciterDetails>(`${this.apiUrl}${id}/`);
  }

  create(body: ReciterFormValue): Observable<ReciterDetails> {
    if (USE_MOCK) {
      const nextId = Math.max(...MOCK_RECITERS.map((r) => r.id), 0) + 1;
      return of({
        ...mockDetail(nextId),
        id: nextId,
        name_ar: body.name_ar,
        name_en: body.name_en,
        bio_ar: body.bio_ar,
        bio_en: body.bio_en,
        nationality: body.nationality,
        slug: `reciter-${nextId}`,
        image_url: body.image_url,
        date_of_death: body.date_of_death,
      }).pipe(delay(400));
    }
    return this.http.post<ReciterDetails>(this.apiUrl, body);
  }

  patch(id: number, body: Partial<ReciterFormValue>): Observable<ReciterDetails> {
    if (USE_MOCK) {
      return of({ ...mockDetail(id), ...body, id } as ReciterDetails).pipe(delay(400));
    }
    return this.http.patch<ReciterDetails>(`${this.apiUrl}${id}/`, body);
  }

  delete(id: number): Observable<void> {
    if (USE_MOCK) {
      return of(void 0).pipe(delay(250));
    }
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
