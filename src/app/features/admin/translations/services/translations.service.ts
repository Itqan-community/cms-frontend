import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  TranslationDetails,
  TranslationFilters,
  TranslationItem,
  TranslationsList,
} from '../models/translations.models';

const USE_MOCK = true;

const MOCK_TRANSLATIONS: TranslationItem[] = [
  {
    id: 1,
    name: 'ترجمة المعاني — مجمع الملك فهد',
    description: 'ترجمة معاني القرآن الكريم إلى عدة لغات',
    publisher: { id: 1, name: 'مجمع الملك فهد' },
    license: 'CC0',
    created_at: '2024-01-10T10:00:00Z',
  },
  {
    id: 2,
    name: 'Sahih International',
    description: 'English translation of the meanings of the Quran',
    publisher: { id: 2, name: 'دار السلام للنشر' },
    license: 'CC-BY',
    created_at: '2024-02-12T08:00:00Z',
  },
  {
    id: 3,
    name: 'ترجمة فهد العرض',
    description: 'ترجمة عربية فصحى للمعاني بأسلوب يسهل فهمها',
    publisher: { id: 3, name: 'مركز تفسير للدراسات القرآنية' },
    license: 'CC-BY-SA',
    created_at: '2024-03-05T14:00:00Z',
  },
  {
    id: 4,
    name: 'Transliteration + English — Muslim Resource',
    description: 'Quranic text with transliteration and English translation',
    publisher: { id: 4, name: 'رابطة العالم الإسلامي' },
    license: 'CC-BY-NC',
    created_at: '2024-04-18T09:30:00Z',
  },
  {
    id: 5,
    name: 'Abdullah Yusuf Ali',
    description: 'Classic English translation with commentary notes',
    publisher: { id: 5, name: 'الجامعة الإسلامية بالمدينة' },
    license: 'CC0',
    created_at: '2024-05-22T11:00:00Z',
  },
];

const MOCK_DETAIL: TranslationDetails = {
  id: 1,
  name_ar: 'ترجمة المعاني — مجمع الملك فهد',
  name_en: 'Meanings Translation — King Fahd Complex',
  description_ar: 'ترجمة معاني القرآن الكريم بإشراف مجمع الملك فهد لطباعة المصحف الشريف',
  description_en: 'Translation of the meanings of the Holy Quran under the supervision of the King Fahd Complex.',
  long_description_ar:
    'تشمل الترجمة عدة لغات وتهدف إلى بيان معاني الآيات بلغات المستهدفين مع مراعاة الدقة والوضوح.',
  long_description_en:
    'The project includes multiple languages and aims to convey the meanings of the verses clearly and accurately.',
  thumbnail_url: null,
  publisher: { id: 1, name: 'مجمع الملك فهد', description: 'مجمع الملك فهد لطباعة المصحف الشريف' },
  license: 'CC0',
  language: 'ar',
  versions: [
    {
      id: 1,
      name: 'الإصدار 1.0',
      file_url: 'https://example.com/translation-v1.json',
      size_bytes: 5242880,
      created_at: '2024-01-10T10:00:00Z',
    },
  ],
  created_at: '2024-01-10T10:00:00Z',
};

@Injectable({
  providedIn: 'root',
})
export class TranslationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/translations/`;

  getList(filters: TranslationFilters): Observable<TranslationsList> {
    if (USE_MOCK) {
      return of({
        results: MOCK_TRANSLATIONS,
        count: MOCK_TRANSLATIONS.length,
      }).pipe(delay(600));
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

    return this.http.get<TranslationsList>(this.apiUrl, { params });
  }

  getDetail(id: number): Observable<TranslationDetails> {
    if (USE_MOCK) {
      return of({ ...MOCK_DETAIL, id }).pipe(delay(400));
    }
    return this.http.get<TranslationDetails>(`${this.apiUrl}${id}/`);
  }

  create(formData: FormData): Observable<TranslationDetails> {
    return this.http.post<TranslationDetails>(this.apiUrl, formData);
  }

  update(id: number, formData: FormData): Observable<TranslationDetails> {
    return this.http.put<TranslationDetails>(`${this.apiUrl}${id}/`, formData);
  }

  patch(id: number, formData: FormData): Observable<TranslationDetails> {
    return this.http.patch<TranslationDetails>(`${this.apiUrl}${id}/`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
