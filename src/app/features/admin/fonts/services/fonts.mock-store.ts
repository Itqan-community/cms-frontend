import { Observable, throwError, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  AssetVersion,
  AssetVersionFormPayload,
  AssetVersionsListParams,
  AssetVersionsListResponse,
} from '../../models/asset-versions.models';
import type {
  AssetSortingQuery,
  FontDetails,
  FontFilters,
  FontFormValue,
  FontItem,
  FontsList,
  PublisherRef,
} from '../models/fonts.models';

const MOCK_DELAY_MS = 300;

interface StoredFont extends FontDetails {
  publisher_id: number;
}

let nextFontId = 5;
let nextVersionId = 300;

const publishers: PublisherRef[] = [
  { id: 1, name: 'King Fahd Complex' },
  { id: 2, name: 'Itqan' },
  { id: 3, name: 'Quran Academy' },
];

const fonts: StoredFont[] = [
  {
    id: 1,
    slug: 'uthmani-quran',
    name_ar: 'خط عثماني — حفص',
    name_en: 'Uthmani Quran Font',
    description_ar: 'خط عثماني رسمي للمصحف الشريف برواية حفص عن عاصم.',
    description_en: 'Official Uthmani script font for the Holy Quran in the Hafs narration.',
    long_description_ar: 'خط مطابق للرسم العثماني المعتمد في طبعات مجمع الملك فهد لطباعة المصحف.',
    long_description_en:
      'Typeface matching the standard Uthmani script used in King Fahd Complex Quran print editions.',
    thumbnail_url: null,
    publisher: publishers[0],
    publisher_id: 1,
    license: 'CC0',
    language: 'ar',
    is_external: false,
    is_open_access: true,
    restricted_for_tenant: false,
    external_url: null,
    versions: [],
    created_at: '2024-02-01T10:00:00Z',
  },
  {
    id: 2,
    slug: 'kfgqpc-hafs',
    name_ar: 'خط مجمع الملك فهد — حفص',
    name_en: 'KFGQPC Hafs Font',
    description_ar: 'خط حفص عن عاصم الصادر عن مجمع الملك فهد لطباعة المصحف الشريف.',
    description_en: 'Hafs narration font published by the King Fahd Complex for Quranic printing.',
    long_description_ar: 'نسخة خطية معتمدة للنشر الرقمي والمطبوع للمصحف الشريف.',
    long_description_en: 'Approved digital and print font edition for Quranic publications.',
    thumbnail_url: null,
    publisher: publishers[0],
    publisher_id: 1,
    license: 'CC-BY',
    language: 'ar',
    is_external: false,
    is_open_access: false,
    restricted_for_tenant: false,
    external_url: null,
    versions: [],
    created_at: '2024-04-10T14:30:00Z',
  },
  {
    id: 3,
    slug: 'indopak-nastaleeq',
    name_ar: 'خط نستعليق — باكستان الهند',
    name_en: 'IndoPak Nastaleeq Font',
    description_ar: 'خط نستعليق شائع في طبعات القرآن في شبه القارة الهندية.',
    description_en: 'Nastaleeq script font widely used in Quran editions across South Asia.',
    long_description_ar: 'مناسب للعرض الرقمي والتطبيقات القرآنية في المنطقة الهندية.',
    long_description_en: 'Suited for digital display and Quranic apps in the South Asian region.',
    thumbnail_url: null,
    publisher: publishers[2],
    publisher_id: 3,
    license: 'CC-BY-SA',
    language: 'ar',
    is_external: true,
    is_open_access: false,
    restricted_for_tenant: true,
    external_url: 'https://example.com/fonts/indopak',
    versions: [],
    created_at: '2024-05-15T09:15:00Z',
  },
];

const versionsBySlug = new Map<string, AssetVersion[]>([
  [
    'uthmani-quran',
    [
      {
        id: 301,
        asset_id: 1,
        name: 'v1.0 — Regular',
        summary: 'Regular weight, full glyph set',
        file_url: 'https://example.com/fonts/uthmani-quran-v1.woff2',
        size_bytes: 850_000,
        created_at: '2024-02-05T08:00:00Z',
      },
    ],
  ],
  [
    'kfgqpc-hafs',
    [
      {
        id: 302,
        asset_id: 2,
        name: 'v2.0 — OTF',
        summary: 'OpenType font package',
        file_url: 'https://example.com/fonts/kfgqpc-hafs-v2.otf',
        size_bytes: 1_200_000,
        created_at: '2024-04-15T10:00:00Z',
      },
    ],
  ],
]);

function withDelay<T>(value: T): Observable<T> {
  return timer(MOCK_DELAY_MS).pipe(map(() => value));
}

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `font-${nextFontId}`;
}

function uniqueSlug(base: string, excludeId?: number): string {
  let slug = base;
  let n = 2;
  while (fonts.some((m) => m.slug === slug && m.id !== excludeId)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function getVersions(slug: string): AssetVersion[] {
  return versionsBySlug.get(slug) ?? [];
}

function attachVersions(m: StoredFont): FontDetails {
  return { ...m, versions: getVersions(m.slug) };
}

function toItem(m: StoredFont): FontItem {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name_ar,
    description: m.description_ar,
    publisher: m.publisher,
    license: m.license,
    language: m.language,
    is_external: m.is_external,
    is_open_access: m.is_open_access,
    restricted_for_tenant: m.restricted_for_tenant,
    created_at: m.created_at,
  };
}

function findBySlug(slug: string): StoredFont | undefined {
  return fonts.find((m) => m.slug === slug);
}

function resolvePublisher(publisherId: number): PublisherRef {
  return (
    publishers.find((p) => p.id === publisherId) ?? {
      id: publisherId,
      name: `Publisher #${publisherId}`,
    }
  );
}

function compareValues(a: string | number, b: string | number): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function applyOrdering(items: StoredFont[], ordering?: AssetSortingQuery): StoredFont[] {
  if (!ordering) return items;
  const desc = ordering.startsWith('-');
  const field = (desc ? ordering.slice(1) : ordering) as keyof StoredFont | 'name';
  const sorted = [...items].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (field) {
      case 'publisher_id':
        av = a.publisher_id;
        bv = b.publisher_id;
        break;
      case 'name':
        av = a.name_ar;
        bv = b.name_ar;
        break;
      case 'created_at':
        av = a.created_at;
        bv = b.created_at;
        break;
      case 'id':
      default:
        av = a.id;
        bv = b.id;
        break;
    }
    const cmp = compareValues(av, bv);
    return desc ? -cmp : cmp;
  });
  return sorted;
}

function filterFonts(filters: FontFilters): StoredFont[] {
  let results = [...fonts];

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    results = results.filter(
      (m) =>
        m.name_ar.toLowerCase().includes(q) ||
        m.name_en.toLowerCase().includes(q) ||
        m.description_ar.toLowerCase().includes(q) ||
        m.description_en.toLowerCase().includes(q)
    );
  }
  if (filters.publisher_id != null) {
    results = results.filter((m) => m.publisher_id === filters.publisher_id);
  }
  if (filters.license_code) {
    results = results.filter((m) => m.license === filters.license_code);
  }
  if (filters.language) {
    results = results.filter((m) => m.language === filters.language);
  }
  if (filters.is_external != null) {
    results = results.filter((m) => m.is_external === filters.is_external);
  }
  if (filters.is_open_access != null) {
    results = results.filter((m) => m.is_open_access === filters.is_open_access);
  }

  return applyOrdering(results, filters.ordering);
}

export function mockGetList(filters: FontFilters): Observable<FontsList> {
  const filtered = filterFonts(filters);
  const start = (filters.page - 1) * filters.page_size;
  const pageItems = filtered.slice(start, start + filters.page_size).map(toItem);
  return withDelay({ results: pageItems, count: filtered.length });
}

export function mockGetDetail(slug: string): Observable<FontDetails> {
  const item = findBySlug(slug);
  if (!item) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }
  return withDelay(attachVersions(item));
}

export function mockCreate(body: FontFormValue): Observable<FontDetails> {
  const baseSlug = slugify(body.name_en || body.name_ar);
  const slug = uniqueSlug(baseSlug);
  const publisher = resolvePublisher(body.publisher_id);
  const created: StoredFont = {
    id: nextFontId++,
    slug,
    name_ar: body.name_ar,
    name_en: body.name_en,
    description_ar: body.description_ar,
    description_en: body.description_en,
    long_description_ar: body.long_description_ar,
    long_description_en: body.long_description_en,
    thumbnail_url: body.thumbnail ? URL.createObjectURL(body.thumbnail) : null,
    publisher,
    publisher_id: body.publisher_id,
    license: body.license,
    language: body.language,
    is_external: body.is_external,
    is_open_access: body.is_open_access,
    restricted_for_tenant: body.restricted_for_tenant,
    external_url: body.external_url ?? null,
    versions: [],
    created_at: new Date().toISOString(),
  };
  fonts.push(created);
  versionsBySlug.set(slug, []);
  return withDelay(attachVersions(created));
}

export function mockPatch(slug: string, body: Partial<FontFormValue>): Observable<FontDetails> {
  const item = findBySlug(slug);
  if (!item) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }

  if (body.name_ar != null) item.name_ar = body.name_ar;
  if (body.name_en != null) item.name_en = body.name_en;
  if (body.description_ar != null) item.description_ar = body.description_ar;
  if (body.description_en != null) item.description_en = body.description_en;
  if (body.long_description_ar != null) item.long_description_ar = body.long_description_ar;
  if (body.long_description_en != null) item.long_description_en = body.long_description_en;
  if (body.license != null) item.license = body.license;
  if (body.language != null) item.language = body.language;
  if (body.publisher_id != null) {
    item.publisher_id = body.publisher_id;
    item.publisher = resolvePublisher(body.publisher_id);
  }
  if (body.is_external != null) item.is_external = body.is_external;
  if (body.is_open_access != null) item.is_open_access = body.is_open_access;
  if (body.restricted_for_tenant != null) item.restricted_for_tenant = body.restricted_for_tenant;
  if (body.external_url !== undefined) item.external_url = body.external_url ?? null;
  if (body.thumbnail) {
    item.thumbnail_url = URL.createObjectURL(body.thumbnail);
  }

  return withDelay(attachVersions(item));
}

export function mockDelete(slug: string): Observable<void> {
  const idx = fonts.findIndex((m) => m.slug === slug);
  if (idx === -1) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }
  fonts.splice(idx, 1);
  versionsBySlug.delete(slug);
  return withDelay(undefined);
}

export function mockListVersions(
  slug: string,
  params: AssetVersionsListParams
): Observable<AssetVersionsListResponse> {
  let versions = getVersions(slug);
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    versions = versions.filter(
      (v) => v.name.toLowerCase().includes(q) || (v.summary ?? '').toLowerCase().includes(q)
    );
  }
  const start = (params.page - 1) * params.page_size;
  const pageItems = versions.slice(start, start + params.page_size);
  return withDelay({ results: pageItems, count: versions.length });
}

export function mockCreateVersion(
  slug: string,
  payload: AssetVersionFormPayload
): Observable<AssetVersion> {
  const font = findBySlug(slug);
  if (!font) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }
  const version: AssetVersion = {
    id: nextVersionId++,
    asset_id: payload.asset_id,
    name: payload.name,
    summary: payload.summary,
    file_url: payload.file
      ? `https://example.com/fonts/${slug}/${payload.file.name}`
      : `https://example.com/fonts/${slug}/file`,
    size_bytes: payload.file?.size ?? 0,
    created_at: new Date().toISOString(),
  };
  const list = getVersions(slug);
  list.push(version);
  versionsBySlug.set(slug, list);
  return withDelay(version);
}

export function mockUpdateVersion(
  slug: string,
  versionId: number,
  payload: AssetVersionFormPayload
): Observable<AssetVersion> {
  const list = getVersions(slug);
  const idx = list.findIndex((v) => v.id === versionId);
  if (idx === -1) {
    return throwError(() => ({ status: 404, message: 'Version not found' }));
  }
  const existing = list[idx];
  const updated: AssetVersion = {
    ...existing,
    name: payload.name,
    summary: payload.summary,
    file_url: payload.file
      ? `https://example.com/fonts/${slug}/${payload.file.name}`
      : existing.file_url,
    size_bytes: payload.file?.size ?? existing.size_bytes,
  };
  list[idx] = updated;
  versionsBySlug.set(slug, list);
  return withDelay(updated);
}

export function mockDeleteVersion(slug: string, versionId: number): Observable<void> {
  const list = getVersions(slug);
  const idx = list.findIndex((v) => v.id === versionId);
  if (idx === -1) {
    return throwError(() => ({ status: 404, message: 'Version not found' }));
  }
  list.splice(idx, 1);
  versionsBySlug.set(slug, list);
  return withDelay(undefined);
}
