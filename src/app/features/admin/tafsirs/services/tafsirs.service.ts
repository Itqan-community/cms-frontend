import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  TafsirDetails,
  TafsirFilters,
  TafsirItem,
  TafsirsList,
} from '../models/tafsirs.models';

const USE_MOCK = true;

const MOCK_TAFSIRS: TafsirItem[] = [
  {
    id: 1,
    name: 'تفسير ابن كثير',
    description: 'تفسير القرآن العظيم للحافظ ابن كثير الدمشقي',
    publisher: { id: 1, name: 'مجمع الملك فهد' },
    license: 'CC0',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    name: 'تفسير الجلالين',
    description: 'تفسير للإمامين جلال الدين المحلي وجلال الدين السيوطي',
    publisher: { id: 2, name: 'دار السلام للنشر' },
    license: 'CC-BY',
    created_at: '2024-02-20T08:30:00Z',
  },
  {
    id: 3,
    name: 'تفسير الطبري',
    description: 'جامع البيان عن تأويل آي القرآن للإمام الطبري',
    publisher: { id: 3, name: 'مركز تفسير للدراسات القرآنية' },
    license: 'CC-BY-SA',
    created_at: '2024-03-10T14:00:00Z',
  },
  {
    id: 4,
    name: 'تفسير السعدي',
    description: 'تيسير الكريم الرحمن في تفسير كلام المنان للشيخ السعدي',
    publisher: { id: 1, name: 'مجمع الملك فهد' },
    license: 'CC0',
    created_at: '2024-04-05T11:00:00Z',
  },
  {
    id: 5,
    name: 'تفسير القرطبي',
    description: 'الجامع لأحكام القرآن للإمام القرطبي',
    publisher: { id: 4, name: 'رابطة العالم الإسلامي' },
    license: 'CC-BY-NC',
    created_at: '2024-05-01T09:00:00Z',
  },
];

const MOCK_DETAIL: TafsirDetails = {
  id: 1,
  name_ar: 'تفسير ابن كثير',
  name_en: 'Tafsir Ibn Kathir',
  description_ar: 'تفسير القرآن العظيم للحافظ ابن كثير الدمشقي',
  description_en: 'Tafsir of the Great Quran by Hafiz Ibn Kathir al-Dimashqi',
  long_description_ar:
    'يُعدّ تفسير ابن كثير من أبرز كتب التفسير بالمأثور في التراث الإسلامي، وهو من تأليف الحافظ إسماعيل بن عمر بن كثير الدمشقي.',
  long_description_en:
    'Ibn Kathir Tafsir is considered one of the most prominent books of tafsir by transmission in the Islamic heritage.',
  thumbnail_url: null,
  publisher: { id: 1, name: 'مجمع الملك فهد', description: 'مجمع الملك فهد لطباعة المصحف الشريف' },
  license: 'CC0',
  language: 'ar',
  versions: [
    {
      id: 1,
      name: 'النسخة 1.0',
      file_url: 'https://example.com/tafsir-ibn-kathir-v1.json',
      size_bytes: 15728640,
      created_at: '2024-01-15T10:00:00Z',
    },
  ],
  created_at: '2024-01-15T10:00:00Z',
};

@Injectable({
  providedIn: 'root',
})
export class TafsirsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/tafsirs/`;

  getList(filters: TafsirFilters): Observable<TafsirsList> {
    if (USE_MOCK) {
      return of({ results: MOCK_TAFSIRS, count: MOCK_TAFSIRS.length }).pipe(delay(600));
    }

    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('page_size', filters.page_size.toString());

    if (filters.search) params = params.set('search', filters.search);
    if (filters.publisher_id != null)
      params = params.set('publisher_id', filters.publisher_id.toString());
    if (filters.license_code) params = params.set('license_code', filters.license_code);
    if (filters.language) params = params.set('language', filters.language);
    if (filters.is_external != null)
      params = params.set('is_external', filters.is_external.toString());
    if (filters.ordering) params = params.set('ordering', filters.ordering);

    return this.http.get<TafsirsList>(this.apiUrl, { params });
  }

  getDetail(id: number): Observable<TafsirDetails> {
    if (USE_MOCK) {
      const found = { ...MOCK_DETAIL, id };
      return of(found).pipe(delay(400));
    }
    return this.http.get<TafsirDetails>(`${this.apiUrl}${id}/`);
  }

  create(formData: FormData): Observable<TafsirDetails> {
    return this.http.post<TafsirDetails>(this.apiUrl, formData);
  }

  update(id: number, formData: FormData): Observable<TafsirDetails> {
    return this.http.put<TafsirDetails>(`${this.apiUrl}${id}/`, formData);
  }

  patch(id: number, formData: FormData): Observable<TafsirDetails> {
    return this.http.patch<TafsirDetails>(`${this.apiUrl}${id}/`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
