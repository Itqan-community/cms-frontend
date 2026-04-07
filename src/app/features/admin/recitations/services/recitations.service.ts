import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  MaddLevel,
  MeemBehavior,
  MinimalQiraah,
  MinimalReciter,
  MinimalRiwayah,
  NamedId,
  RecitationDetails,
  RecitationFormValue,
  RecitationListFilters,
  RecitationListItem,
  RecitationsListResponse,
} from '../models/recitations.models';

const USE_MOCK = true;

const MOCK_QIRAAH: MinimalQiraah[] = [
  { id: 1, name: 'حفص عن عاصم', bio: '' },
  { id: 2, name: 'ورش عن نافع', bio: '' },
];

const MOCK_RIWAYAH: MinimalRiwayah[] = [
  { id: 1, name: 'المصحف المرتل', bio: '' },
  { id: 2, name: 'المصحف المجود', bio: '' },
];

const MOCK_RECITERS_MIN: MinimalReciter[] = [
  { id: 1, name: 'عبد الباسط عبد الصمد' },
  { id: 2, name: 'مشاري العفاسي' },
];

const MOCK_LIST: RecitationListItem[] = [
  {
    id: 1,
    name: 'تلاوة المصحف المرتل — حفص',
    description: 'مصحف صوتي مرتل برواية حفص عن عاصم',
    publisher: { id: 1, name: 'مجمع الملك فهد' },
    license: 'CC-BY',
    created_at: '2024-02-01T10:00:00Z',
    reciter: MOCK_RECITERS_MIN[0],
    qiraah: MOCK_QIRAAH[0],
    riwayah: MOCK_RIWAYAH[0],
    madd_level: MaddLevel.TWASSUT,
    meem_behavior: MeemBehavior.SILAH,
    year: 2023,
  },
  {
    id: 2,
    name: 'تلاوة مجود — ورش',
    description: 'مصحف مجود برواية ورش عن نافع',
    publisher: { id: 2, name: 'دار السلام للنشر' },
    license: 'CC0',
    created_at: '2024-03-12T14:30:00Z',
    reciter: MOCK_RECITERS_MIN[1],
    qiraah: MOCK_QIRAAH[1],
    riwayah: MOCK_RIWAYAH[1],
    madd_level: MaddLevel.QASR,
    meem_behavior: MeemBehavior.SKOUN,
    year: 2024,
  },
];

const mockDetail = (id: number): RecitationDetails => {
  const row = MOCK_LIST.find((r) => r.id === id) ?? MOCK_LIST[0];
  return {
    id: row.id,
    name_ar: row.name,
    name_en: `Recitation ${row.id}`,
    description_ar: row.description,
    description_en: row.description,
    publisher: { ...row.publisher, description: '' },
    reciter: row.reciter,
    qiraah: row.qiraah,
    riwayah: row.riwayah,
    madd_level: row.madd_level,
    meem_behavior: row.meem_behavior,
    year: row.year,
    license: row.license,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
};

@Injectable({ providedIn: 'root' })
export class RecitationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/recitations/`;

  qiraahOptions(): Observable<NamedId[]> {
    return of(MOCK_QIRAAH.map((q) => ({ id: q.id, name: q.name }))).pipe(delay(50));
  }

  riwayahOptions(): Observable<NamedId[]> {
    return of(MOCK_RIWAYAH.map((q) => ({ id: q.id, name: q.name }))).pipe(delay(50));
  }

  getList(filters: RecitationListFilters): Observable<RecitationsListResponse> {
    if (USE_MOCK) {
      let rows = [...MOCK_LIST];
      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        rows = rows.filter((r) => r.name.toLowerCase().includes(q));
      }
      if (filters.publisher_id != null) {
        rows = rows.filter((r) => r.publisher.id === filters.publisher_id);
      }
      if (filters.reciter_id != null) {
        rows = rows.filter((r) => r.reciter.id === filters.reciter_id);
      }
      if (filters.qiraah_id != null) {
        rows = rows.filter((r) => r.qiraah.id === filters.qiraah_id);
      }
      if (filters.riwayah_id != null) {
        rows = rows.filter((r) => r.riwayah.id === filters.riwayah_id);
      }
      if (filters.madd_level != null) {
        rows = rows.filter((r) => r.madd_level === filters.madd_level);
      }
      if (filters.meem_behavior != null) {
        rows = rows.filter((r) => r.meem_behavior === filters.meem_behavior);
      }
      if (filters.year != null && filters.year > 0) {
        rows = rows.filter((r) => r.year === filters.year);
      }
      if (filters.license) {
        rows = rows.filter((r) => r.license === filters.license);
      }
      return of({ results: rows, count: rows.length }).pipe(delay(450));
    }

    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('page_size', filters.page_size.toString());

    if (filters.search) params = params.set('search', filters.search);
    if (filters.publisher_id != null)
      params = params.set('publisher_id', filters.publisher_id.toString());
    if (filters.reciter_id != null)
      params = params.set('reciter_id', filters.reciter_id.toString());
    if (filters.qiraah_id != null)
      params = params.set('qiraah_id', filters.qiraah_id.toString());
    if (filters.riwayah_id != null)
      params = params.set('riwayah_id', filters.riwayah_id.toString());
    if (filters.madd_level != null) params = params.set('madd_level', filters.madd_level);
    if (filters.meem_behavior != null)
      params = params.set('meem_behavior', filters.meem_behavior);
    if (filters.year != null) params = params.set('year', String(filters.year));
    if (filters.license) params = params.set('license', filters.license);
    if (filters.ordering) params = params.set('ordering', filters.ordering);

    return this.http.get<RecitationsListResponse>(this.apiUrl, { params });
  }

  getDetail(id: number): Observable<RecitationDetails> {
    if (USE_MOCK) {
      return of(mockDetail(id)).pipe(delay(350));
    }
    return this.http.get<RecitationDetails>(`${this.apiUrl}${id}/`);
  }

  create(body: RecitationFormValue): Observable<RecitationDetails> {
    if (USE_MOCK) {
      const nextId = Math.max(...MOCK_LIST.map((r) => r.id), 0) + 1;
      const publisher =
        MOCK_LIST.find((r) => r.publisher.id === body.publisher_id)?.publisher ?? {
          id: body.publisher_id,
          name: '—',
        };
      const reciter =
        MOCK_RECITERS_MIN.find((r) => r.id === body.reciter_id) ?? {
          id: body.reciter_id,
          name: '—',
        };
      const qiraah =
        MOCK_QIRAAH.find((q) => q.id === body.qiraah_id) ?? MOCK_QIRAAH[0];
      const riwayah =
        MOCK_RIWAYAH.find((r) => r.id === body.riwayah_id) ?? MOCK_RIWAYAH[0];
      return of({
        ...mockDetail(MOCK_LIST[0].id),
        id: nextId,
        name_ar: body.name_ar,
        name_en: body.name_en,
        description_ar: body.description_ar,
        description_en: body.description_en,
        publisher: { ...publisher, description: '' },
        reciter,
        qiraah,
        riwayah,
        madd_level: body.madd_level,
        meem_behavior: body.meem_behavior,
        year: body.year,
        license: body.license,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).pipe(delay(400));
    }
    return this.http.post<RecitationDetails>(this.apiUrl, body);
  }

  patch(id: number, body: Partial<RecitationFormValue>): Observable<RecitationDetails> {
    if (USE_MOCK) {
      const cur = mockDetail(id);
      const merged = { ...cur, ...body, id };
      const publisherId = body.publisher_id ?? cur.publisher.id;
      const publisher =
        MOCK_LIST.find((r) => r.publisher.id === publisherId)?.publisher ??
        ({ ...cur.publisher, id: publisherId } as RecitationDetails['publisher']);
      const reciterId = body.reciter_id ?? cur.reciter.id;
      const reciter =
        MOCK_RECITERS_MIN.find((r) => r.id === reciterId) ??
        ({ ...cur.reciter, id: reciterId });
      const qiraahId = body.qiraah_id ?? cur.qiraah.id;
      const qiraah = MOCK_QIRAAH.find((q) => q.id === qiraahId) ?? cur.qiraah;
      const riwayahId = body.riwayah_id ?? cur.riwayah.id;
      const riwayah = MOCK_RIWAYAH.find((r) => r.id === riwayahId) ?? cur.riwayah;
      return of({
        ...merged,
        publisher: {
          id: publisher.id,
          name: publisher.name,
          description: cur.publisher.description ?? '',
        },
        reciter,
        qiraah,
        riwayah,
      }).pipe(delay(400));
    }
    return this.http.patch<RecitationDetails>(`${this.apiUrl}${id}/`, body);
  }

  delete(id: number): Observable<void> {
    if (USE_MOCK) {
      return of(void 0).pipe(delay(250));
    }
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
