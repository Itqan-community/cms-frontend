import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
// TODO: restore when removing mock data
// import { HttpClient, inject } from '@angular/common/http';
// import { environment } from '../../../../../environments/environment';

export interface CmsPublisher {
  id?: number;
  name_ar: string;
  name_en: string;
  country?: string;
  website?: string;
  icon_url?: string;
  foundation_year?: number;
  address?: string;
  is_verified?: boolean;
  contact_email?: string;
  description?: string;
  content_types?: string[];
  unique_identifier?: string;
}

export interface CmsPublisherListResponse {
  count: number;
  results: CmsPublisher[];
}

// ── MOCK DATA — remove before PR ────────────────────────────
const MOCK_PUBLISHERS: CmsPublisher[] = [
  {
    id: 1,
    name_ar: 'كل آية',
    name_en: 'EveryAyah.com',
    country: 'المملكة العربية السعودية',
    foundation_year: 2008,
    website: 'https://everyayah.com',
    contact_email: 'info@everyayah.com',
    description: 'موقع متخصص في التلاوات القرآنية بصوت القراء المشهورين',
    content_types: ['recitations', 'audio_mushaf'],
    unique_identifier: 'everyayah',
    is_verified: true,
  },
  {
    id: 2,
    name_ar: 'إسلام ويب',
    name_en: 'IslamWeb.net',
    country: 'قطر',
    foundation_year: 1998,
    website: 'https://islamweb.net',
    contact_email: 'info@islamweb.net',
    description: 'شبكة إسلام ويب – مركز الفتوى والمكتبة الإسلامية',
    content_types: ['tafseer', 'translations'],
    unique_identifier: 'islamweb',
    is_verified: true,
  },
  {
    id: 3,
    name_ar: 'التفسير',
    name_en: 'AltTafsir.com',
    country: 'الأردن',
    foundation_year: 2003,
    website: 'https://altafsir.com',
    contact_email: 'info@altafsir.com',
    description: 'موسوعة التفاسير القرآنية',
    content_types: ['tafseer'],
    unique_identifier: 'altafsir',
    is_verified: false,
  },
  {
    id: 4,
    name_ar: 'مجمع الملك فهد لطباعة المصحف الشريف',
    name_en: 'King Fahd Complex',
    country: 'المملكة العربية السعودية',
    foundation_year: 1984,
    website: 'https://qurancomplex.gov.sa',
    contact_email: 'contact@qurancomplex.gov.sa',
    description: 'المصدر الرسمي للمصاحف المطبوعة والإلكترونية',
    content_types: ['tafseer', 'translations', 'recitations', 'text_mushaf'],
    unique_identifier: 'king-fahd-complex',
    is_verified: true,
  },
  {
    id: 5,
    name_ar: 'تنزيل',
    name_en: 'Tanzil.net',
    country: 'إيران',
    foundation_year: 2007,
    website: 'https://tanzil.net',
    contact_email: 'contact@tanzil.net',
    description: 'مشروع النصوص القرآنية والقراءات المختلفة',
    content_types: ['text_mushaf', 'translations'],
    unique_identifier: 'tanzil',
    is_verified: false,
  },
  {
    id: 6,
    name_ar: 'القرآن الكريم MP3',
    name_en: 'MP3 Quran',
    country: 'مصر',
    foundation_year: 2005,
    website: 'https://mp3quran.net',
    contact_email: 'info@mp3quran.net',
    description: 'مكتبة شاملة لتلاوات القرآن الكريم',
    content_types: ['recitations', 'audio_mushaf', 'adhan'],
    unique_identifier: 'mp3quran',
    is_verified: true,
  },
];
// ── END MOCK ─────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CmsPublishersService {
  getPublishers(): Observable<CmsPublisherListResponse> {
    // MOCK — remove before PR
    return of({ count: MOCK_PUBLISHERS.length, results: MOCK_PUBLISHERS });
    // return this.http.get<CmsPublisherListResponse>(`${this.BASE_URL}/portal/publishers/`);
  }

  getPublisher(id: string): Observable<CmsPublisher> {
    // MOCK — remove before PR
    const found = MOCK_PUBLISHERS.find((p) => String(p.id) === id) ?? MOCK_PUBLISHERS[0];
    return of(found);
    // return this.http.get<CmsPublisher>(`${this.BASE_URL}/portal/publishers/${id}`);
  }

  updatePublisher(id: string, data: Partial<CmsPublisher>): Observable<CmsPublisher> {
    // MOCK — remove before PR
    const index = MOCK_PUBLISHERS.findIndex((p) => String(p.id) === id);
    if (index !== -1) {
      MOCK_PUBLISHERS[index] = { ...MOCK_PUBLISHERS[index], ...data };
      return of(MOCK_PUBLISHERS[index]);
    }
    return of({ ...MOCK_PUBLISHERS[0], ...data });
    // return this.http.put<CmsPublisher>(`${this.BASE_URL}/portal/publishers/${id}`, data);
  }

  createPublisher(data: Partial<CmsPublisher>): Observable<CmsPublisher> {
    // MOCK — remove before PR
    const newPublisher: CmsPublisher = {
      id: MOCK_PUBLISHERS.length + 1,
      name_ar: data.name_ar ?? '',
      name_en: data.name_en ?? '',
      ...data,
    };
    MOCK_PUBLISHERS.push(newPublisher);
    return of(newPublisher);
    // return this.http.post<CmsPublisher>(`${this.BASE_URL}/portal/publishers/`, data);
  }

  deletePublisher(_id: string): Observable<void> {
    // MOCK — remove before PR
    return of(void 0);
    // return this.http.delete<void>(`${this.BASE_URL}/portal/publishers/${id}`);
  }
}
