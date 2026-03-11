import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  Publisher,
  PublisherCreate,
  PublishersResponse,
  PublishersStats,
} from '../models/publisher.model';

const MOCK_PUBLISHERS: Publisher[] = [
  {
    id: 'mock-1',
    name_ar: 'مجمع الملك فهد لطباعة المصحف الشريف',
    name_en: 'King Fahd Complex',
    country: 'السعودية',
    website: 'https://qurancomplex.gov.sa',
    icon_url: '',
    foundation_year: 1984,
    address: 'المدينة المنورة',
    is_verified: true,
    contact_email: 'info@qurancomplex.gov.sa',
    description: 'مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة',
  },
  {
    id: 'mock-2',
    name_ar: 'دار السلام للطباعة والنشر',
    name_en: 'Dar Al-Salam',
    country: 'مصر',
    website: 'https://dar-alsalam.com',
    icon_url: '',
    foundation_year: 1975,
    address: 'القاهرة',
    is_verified: true,
    contact_email: 'info@dar-alsalam.com',
    description: 'دار السلام للطباعة والنشر والتوزيع',
  },
  {
    id: 'mock-3',
    name_ar: 'مؤسسة الرسالة',
    name_en: 'Al-Risala Foundation',
    country: 'لبنان',
    website: '',
    icon_url: '',
    foundation_year: 1970,
    address: 'بيروت',
    is_verified: false,
    contact_email: '',
    description: 'مؤسسة الرسالة للنشر والتوزيع',
  },
];

const MOCK_STATS: PublishersStats = {
  total_publishers: 3,
  total_active: 2,
  total_countries: 3,
  isMock: true,
};

@Injectable({
  providedIn: 'root',
})
export class PublishersService {
  private readonly http = inject(HttpClient);
  private readonly messages = inject(NzMessageService);
  private readonly BASE_URL = environment.API_BASE_URL;

  getPublishers(
    search: string = '',
    page: number = 1,
    pageSize: number = 12,
    isActive?: boolean
  ): Observable<PublishersResponse> {
    const params: Record<string, string> = {
      page: String(page),
      page_size: String(pageSize),
    };
    if (search) params['search'] = search;
    if (isActive !== undefined) params['is_active'] = String(isActive);

    return this.http
      .get<PublishersResponse>(`${this.BASE_URL}/portal/publishers/`, { params })
      .pipe(
        catchError(() => {
          this.messages.warning('تعذر تحميل الناشرين، يتم عرض بيانات تجريبية مؤقتًا.');
          const filtered = search
            ? MOCK_PUBLISHERS.filter(
                (p) => p.name_ar.includes(search) || p.name_en.toLowerCase().includes(search.toLowerCase())
              )
            : MOCK_PUBLISHERS;
          return of({
            count: filtered.length,
            next: null,
            previous: null,
            results: filtered,
          });
        })
      );
  }

  createPublisher(data: PublisherCreate): Observable<Publisher> {
    return this.http.post<Publisher>(`${this.BASE_URL}/portal/publishers/`, data);
  }

  getStats(): Observable<PublishersStats> {
    return this.http
      .get<PublishersStats>(`${this.BASE_URL}/portal/publishers/statistics/`)
      .pipe(
        catchError(() => {
          this.messages.warning('تعذر تحميل الإحصائيات، يتم عرض بيانات تجريبية مؤقتًا.');
          return of(MOCK_STATS);
        })
      );
  }
}
