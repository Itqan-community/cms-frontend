import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
// TODO: restore when removing mock data
// import { HttpClient, HttpParams, inject } from '@angular/common/http';
// import { environment } from '../../../../../environments/environment';

// ─────────────────────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────────────────────

export type ContentType =
  | 'recitations'
  | 'audio_mushaf'
  | 'text_mushaf'
  | 'tafseer'
  | 'translations'
  | 'adhan'
  | 'linguistics'
  | 'tajweed';

export interface CmsPublisher {
  id: number;
  name_ar: string;
  name_en: string;
  unique_identifier: string;
  country?: string;
  address?: string;
  website?: string;
  contact_email?: string;
  icon_url?: string;
  foundation_year?: number;
  description?: string;
  content_types?: ContentType[];
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CmsPublisherListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CmsPublisher[];
}

/** Query params for GET /portal/publishers/ */
export interface PublisherListParams {
  page?: number;
  page_size?: number;
  search?: string;
  country?: string;
  content_type?: ContentType;
  is_verified?: boolean;
  ordering?: 'name_ar' | '-name_ar' | 'foundation_year' | '-foundation_year' | 'created_at' | '-created_at';
}

/** Body for POST /portal/publishers/ */
export type CreatePublisherDto = Omit<CmsPublisher, 'id' | 'created_at' | 'updated_at'>;

/** Body for PATCH /portal/publishers/:id/ */
export type UpdatePublisherDto = Partial<CreatePublisherDto>;

// ─────────────────────────────────────────────────────────────
// Mock data — remove before PR
// ─────────────────────────────────────────────────────────────

const MOCK_PUBLISHERS: CmsPublisher[] = [
  {
    id: 1,
    name_ar: 'كل آية',
    name_en: 'EveryAyah.com',
    unique_identifier: 'everyayah',
    country: 'المملكة العربية السعودية',
    address: 'الرياض، المملكة العربية السعودية',
    foundation_year: 2008,
    website: 'https://everyayah.com',
    contact_email: 'info@everyayah.com',
    description: 'موقع متخصص في التلاوات القرآنية بأصوات القراء المشهورين حول العالم، يوفر ملفات صوتية عالية الجودة.',
    content_types: ['recitations', 'audio_mushaf'],
    is_verified: true,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-06-15T12:30:00Z',
  },
  {
    id: 2,
    name_ar: 'إسلام ويب',
    name_en: 'IslamWeb.net',
    unique_identifier: 'islamweb',
    country: 'قطر',
    address: 'الدوحة، قطر',
    foundation_year: 1998,
    website: 'https://islamweb.net',
    contact_email: 'info@islamweb.net',
    description: 'شبكة إسلام ويب – مركز الفتوى والمكتبة الإسلامية الشاملة، تضم آلاف التفاسير والأحاديث والفتاوى.',
    content_types: ['tafseer', 'translations'],
    is_verified: true,
    created_at: '2024-01-12T09:00:00Z',
    updated_at: '2024-07-01T10:00:00Z',
  },
  {
    id: 3,
    name_ar: 'موسوعة التفسير',
    name_en: 'AltTafsir.com',
    unique_identifier: 'altafsir',
    country: 'الأردن',
    address: 'عمّان، الأردن',
    foundation_year: 2003,
    website: 'https://altafsir.com',
    contact_email: 'info@altafsir.com',
    description: 'موسوعة رقمية شاملة للتفاسير القرآنية الكلاسيكية والمعاصرة بأكثر من لغة.',
    content_types: ['tafseer'],
    is_verified: false,
    created_at: '2024-01-15T11:00:00Z',
    updated_at: '2024-05-20T14:00:00Z',
  },
  {
    id: 4,
    name_ar: 'مجمع الملك فهد لطباعة المصحف الشريف',
    name_en: 'King Fahd Quran Printing Complex',
    unique_identifier: 'king-fahd-complex',
    country: 'المملكة العربية السعودية',
    address: 'المدينة المنورة، المملكة العربية السعودية',
    foundation_year: 1984,
    website: 'https://qurancomplex.gov.sa',
    contact_email: 'contact@qurancomplex.gov.sa',
    description: 'المصدر الرسمي للمصاحف المطبوعة والرقمية، يصدر ترجمات معتمدة للقرآن الكريم بأكثر من 70 لغة.',
    content_types: ['tafseer', 'translations', 'recitations', 'text_mushaf'],
    is_verified: true,
    created_at: '2024-01-20T07:00:00Z',
    updated_at: '2024-08-10T09:00:00Z',
  },
  {
    id: 5,
    name_ar: 'تنزيل',
    name_en: 'Tanzil.net',
    unique_identifier: 'tanzil',
    country: 'إيران',
    address: 'طهران، إيران',
    foundation_year: 2007,
    website: 'https://tanzil.net',
    contact_email: 'contact@tanzil.net',
    description: 'مشروع النصوص القرآنية الرقمية يوفر نصوص المصحف بالقراءات المختلفة وترجمات متعددة.',
    content_types: ['text_mushaf', 'translations'],
    is_verified: false,
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-06-01T08:00:00Z',
  },
  {
    id: 6,
    name_ar: 'القرآن الكريم MP3',
    name_en: 'MP3 Quran',
    unique_identifier: 'mp3quran',
    country: 'مصر',
    address: 'القاهرة، مصر',
    foundation_year: 2005,
    website: 'https://mp3quran.net',
    contact_email: 'info@mp3quran.net',
    description: 'مكتبة صوتية شاملة لتلاوات القرآن الكريم بأصوات أكثر من 150 قارئاً من مختلف دول العالم.',
    content_types: ['recitations', 'audio_mushaf', 'adhan'],
    is_verified: true,
    created_at: '2024-02-10T12:00:00Z',
    updated_at: '2024-07-20T11:00:00Z',
  },
  {
    id: 7,
    name_ar: 'قرآن فلاش',
    name_en: 'QuranFlash.com',
    unique_identifier: 'quranflash',
    country: 'الكويت',
    address: 'الكويت',
    foundation_year: 2006,
    website: 'https://quranflash.com',
    contact_email: 'info@quranflash.com',
    description: 'عرض المصحف الشريف رقمياً بطريقة احترافية مع إمكانية الاستماع والبحث.',
    content_types: ['text_mushaf', 'recitations'],
    is_verified: true,
    created_at: '2024-02-15T09:00:00Z',
    updated_at: '2024-05-10T13:00:00Z',
  },
  {
    id: 8,
    name_ar: 'صخر للبرمجيات',
    name_en: 'Sakhr Software',
    unique_identifier: 'sakhr',
    country: 'الكويت',
    address: 'الكويت',
    foundation_year: 1985,
    website: 'https://sakhr.com',
    contact_email: 'info@sakhr.com',
    description: 'شركة رائدة في برمجيات اللغة العربية والمحتوى الإسلامي الرقمي.',
    content_types: ['text_mushaf', 'tafseer', 'linguistics'],
    is_verified: true,
    created_at: '2024-03-01T08:00:00Z',
    updated_at: '2024-06-25T10:00:00Z',
  },
  {
    id: 9,
    name_ar: 'الباحث القرآني',
    name_en: 'Quran Research',
    unique_identifier: 'quran-research',
    country: 'الإمارات العربية المتحدة',
    address: 'دبي، الإمارات',
    foundation_year: 2010,
    website: 'https://quranresearch.ae',
    contact_email: 'contact@quranresearch.ae',
    description: 'منصة بحثية متخصصة في الدراسات القرآنية اللغوية والنحوية والبلاغية.',
    content_types: ['linguistics', 'tajweed', 'tafseer'],
    is_verified: false,
    created_at: '2024-03-10T11:00:00Z',
    updated_at: '2024-07-05T09:00:00Z',
  },
  {
    id: 10,
    name_ar: 'الإعجاز القرآني',
    name_en: 'Quran Miracle',
    unique_identifier: 'quran-miracle',
    country: 'تركيا',
    address: 'إسطنبول، تركيا',
    foundation_year: 2012,
    website: 'https://quranmiracle.org',
    contact_email: 'info@quranmiracle.org',
    description: 'موقع متخصص في الإعجاز العلمي للقرآن الكريم، يقدم محتوى باللغتين العربية والتركية.',
    content_types: ['tafseer', 'translations'],
    is_verified: false,
    created_at: '2024-03-20T14:00:00Z',
    updated_at: '2024-06-30T15:00:00Z',
  },
  {
    id: 11,
    name_ar: 'مركز تدبر',
    name_en: 'Tadabbur Center',
    unique_identifier: 'tadabbur',
    country: 'المملكة العربية السعودية',
    address: 'جدة، المملكة العربية السعودية',
    foundation_year: 2015,
    website: 'https://tadabbur.org',
    contact_email: 'info@tadabbur.org',
    description: 'مركز متخصص في تدبر القرآن الكريم وتيسير فهمه للمسلمين في كل مكان.',
    content_types: ['tafseer', 'tajweed', 'recitations'],
    is_verified: true,
    created_at: '2024-04-01T10:00:00Z',
    updated_at: '2024-08-01T12:00:00Z',
  },
  {
    id: 12,
    name_ar: 'الفرقان للنشر',
    name_en: 'Al-Furqan Publishing',
    unique_identifier: 'alfurqan',
    country: 'المغرب',
    address: 'الرباط، المغرب',
    foundation_year: 1999,
    website: 'https://alfurqan.ma',
    contact_email: 'contact@alfurqan.ma',
    description: 'دار نشر متخصصة في الكتب الإسلامية والمصاحف ذات الجودة العالية.',
    content_types: ['text_mushaf', 'translations', 'tafseer'],
    is_verified: true,
    created_at: '2024-04-10T09:00:00Z',
    updated_at: '2024-07-15T11:00:00Z',
  },
];

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CmsPublishersService {
  // TODO: restore when removing mock data
  // private http = inject(HttpClient);
  // private BASE_URL = environment.apiUrl;

  /** GET /portal/publishers/ */
  getPublishers(params?: PublisherListParams): Observable<CmsPublisherListResponse> {
    // ── MOCK ──────────────────────────────────────────────────
    let results = [...MOCK_PUBLISHERS];
    if (params?.search) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (p) => p.name_ar.includes(q) || p.name_en.toLowerCase().includes(q),
      );
    }
    if (params?.country) {
      results = results.filter((p) => p.country === params.country);
    }
    if (params?.content_type) {
      results = results.filter((p) => p.content_types?.includes(params.content_type!));
    }
    if (params?.is_verified !== undefined) {
      results = results.filter((p) => p.is_verified === params.is_verified);
    }
    return of({ count: results.length, next: null, previous: null, results });
    // ── REAL ──────────────────────────────────────────────────
    // let httpParams = new HttpParams();
    // if (params?.page)         httpParams = httpParams.set('page', params.page);
    // if (params?.page_size)    httpParams = httpParams.set('page_size', params.page_size);
    // if (params?.search)       httpParams = httpParams.set('search', params.search);
    // if (params?.country)      httpParams = httpParams.set('country', params.country);
    // if (params?.content_type) httpParams = httpParams.set('content_type', params.content_type);
    // if (params?.is_verified !== undefined) httpParams = httpParams.set('is_verified', params.is_verified);
    // if (params?.ordering)     httpParams = httpParams.set('ordering', params.ordering);
    // return this.http.get<CmsPublisherListResponse>(`${this.BASE_URL}/portal/publishers/`, { params: httpParams });
  }

  /** GET /portal/publishers/:id/ */
  getPublisher(id: number | string): Observable<CmsPublisher> {
    // ── MOCK ──────────────────────────────────────────────────
    const found = MOCK_PUBLISHERS.find((p) => String(p.id) === String(id)) ?? MOCK_PUBLISHERS[0];
    return of({ ...found });
    // ── REAL ──────────────────────────────────────────────────
    // return this.http.get<CmsPublisher>(`${this.BASE_URL}/portal/publishers/${id}/`);
  }

  /** POST /portal/publishers/ */
  createPublisher(data: CreatePublisherDto): Observable<CmsPublisher> {
    // ── MOCK ──────────────────────────────────────────────────
    const newPublisher: CmsPublisher = {
      ...data,
      id: Math.max(...MOCK_PUBLISHERS.map((p) => p.id)) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_PUBLISHERS.push(newPublisher);
    return of({ ...newPublisher });
    // ── REAL ──────────────────────────────────────────────────
    // return this.http.post<CmsPublisher>(`${this.BASE_URL}/portal/publishers/`, data);
  }

  /** PATCH /portal/publishers/:id/ */
  updatePublisher(id: number | string, data: UpdatePublisherDto): Observable<CmsPublisher> {
    // ── MOCK ──────────────────────────────────────────────────
    const index = MOCK_PUBLISHERS.findIndex((p) => String(p.id) === String(id));
    if (index !== -1) {
      MOCK_PUBLISHERS[index] = { ...MOCK_PUBLISHERS[index], ...data, updated_at: new Date().toISOString() };
      return of({ ...MOCK_PUBLISHERS[index] });
    }
    return of({ ...MOCK_PUBLISHERS[0], ...data });
    // ── REAL ──────────────────────────────────────────────────
    // return this.http.patch<CmsPublisher>(`${this.BASE_URL}/portal/publishers/${id}/`, data);
  }

  /** DELETE /portal/publishers/:id/ */
  deletePublisher(id: number | string): Observable<void> {
    // ── MOCK ──────────────────────────────────────────────────
    const index = MOCK_PUBLISHERS.findIndex((p) => String(p.id) === String(id));
    if (index !== -1) MOCK_PUBLISHERS.splice(index, 1);
    return of(void 0);
    // ── REAL ──────────────────────────────────────────────────
    // return this.http.delete<void>(`${this.BASE_URL}/portal/publishers/${id}/`);
  }

  /** GET /portal/publishers/:id/content-types/ */
  getPublisherContentTypes(id: number | string): Observable<ContentType[]> {
    // ── MOCK ──────────────────────────────────────────────────
    const found = MOCK_PUBLISHERS.find((p) => String(p.id) === String(id));
    return of(found?.content_types ?? []);
    // ── REAL ──────────────────────────────────────────────────
    // return this.http.get<ContentType[]>(`${this.BASE_URL}/portal/publishers/${id}/content-types/`);
  }

  /** GET /portal/publishers/countries/ — distinct country list */
  getCountries(): Observable<string[]> {
    // ── MOCK ──────────────────────────────────────────────────
    const countries = [...new Set(MOCK_PUBLISHERS.map((p) => p.country).filter(Boolean))] as string[];
    return of(countries);
    // ── REAL ──────────────────────────────────────────────────
    // return this.http.get<string[]>(`${this.BASE_URL}/portal/publishers/countries/`);
  }
}
