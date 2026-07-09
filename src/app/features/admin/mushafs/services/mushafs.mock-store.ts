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
  MushafDetails,
  MushafFilters,
  MushafFormValue,
  MushafItem,
  MushafsList,
  PublisherRef,
} from '../models/mushafs.models';

const MOCK_DELAY_MS = 300;

interface StoredMushaf extends MushafDetails {
  publisher_id: number;
}

let nextMushafId = 5;
let nextVersionId = 200;

const publishers: PublisherRef[] = [
  { id: 1, name: 'King Fahd Complex' },
  { id: 2, name: 'Itqan' },
  { id: 3, name: 'Quran Academy' },
];

const mushafs: StoredMushaf[] = [
  {
    id: 1,
    slug: 'madinah-hafs',
    name_ar: 'مصحف المدينة المنورة — حفص',
    name_en: 'Madinah Mushaf — Hafs',
    description_ar: 'المصحف الشريف برواية حفص عن عاصم، مطبوع بمجمع الملك فهد.',
    description_en: 'The Holy Quran in the Hafs narration, printed by the King Fahd Complex.',
    long_description_ar:
      'نسخة رسمية من المصحف الشريف برواية حفص عن عاصم بن أبي النجود، بخط المصحف المدني المعتمد.',
    long_description_en:
      'Official edition of the Holy Quran in the Hafs narration, in the standard Madinah script.',
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
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    slug: 'warsh',
    name_ar: 'مصحف ورش عن نافع',
    name_en: 'Warsh Mushaf',
    description_ar: 'المصحف الشريف برواية ورش عن نافع المدني.',
    description_en: 'The Holy Quran in the Warsh narration from Nafi al-Madani.',
    long_description_ar: 'نسخة معتمدة من المصحف برواية ورش، شائعة في شمال وغرب أفريقيا.',
    long_description_en:
      'Approved edition in the Warsh narration, widely used in North and West Africa.',
    thumbnail_url: null,
    publisher: publishers[1],
    publisher_id: 2,
    license: 'CC-BY',
    language: 'ar',
    is_external: false,
    is_open_access: false,
    restricted_for_tenant: false,
    external_url: null,
    versions: [],
    created_at: '2024-03-20T14:30:00Z',
  },
  {
    id: 3,
    slug: 'qaloon',
    name_ar: 'مصحف قالون عن نافع',
    name_en: 'Qaloon Mushaf',
    description_ar: 'المصحف الشريف برواية قالون عن نافع.',
    description_en: 'The Holy Quran in the Qaloon narration from Nafi.',
    long_description_ar: 'نسخة برواية قالون، معتمدة في ليبيا وتونس ومناطق أخرى.',
    long_description_en: 'Qaloon narration edition, used in Libya, Tunisia, and other regions.',
    thumbnail_url: null,
    publisher: publishers[2],
    publisher_id: 3,
    license: 'CC-BY-SA',
    language: 'ar',
    is_external: true,
    is_open_access: false,
    restricted_for_tenant: true,
    external_url: 'https://example.com/qaloon',
    versions: [],
    created_at: '2024-06-01T09:15:00Z',
  },
];

const versionsBySlug = new Map<string, AssetVersion[]>([
  [
    'madinah-hafs',
    [
      {
        id: 101,
        asset_id: 1,
        name: 'v1.0 — full text',
        summary: 'Complete Uthmani text, 604 pages',
        file_url: 'https://example.com/mushafs/madinah-hafs-v1.json',
        size_bytes: 4_500_000,
        created_at: '2024-01-20T08:00:00Z',
      },
      {
        id: 102,
        asset_id: 1,
        name: 'v1.1 — metadata update',
        summary: 'Added surah metadata',
        file_url: 'https://example.com/mushafs/madinah-hafs-v1.1.json',
        size_bytes: 4_520_000,
        created_at: '2024-02-10T12:00:00Z',
      },
    ],
  ],
  [
    'warsh',
    [
      {
        id: 103,
        asset_id: 2,
        name: 'v1.0',
        summary: 'Warsh text edition',
        file_url: 'https://example.com/mushafs/warsh-v1.json',
        size_bytes: 4_400_000,
        created_at: '2024-03-25T10:00:00Z',
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
  return base || `mushaf-${nextMushafId}`;
}

function uniqueSlug(base: string, excludeId?: number): string {
  let slug = base;
  let n = 2;
  while (mushafs.some((m) => m.slug === slug && m.id !== excludeId)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function getVersions(slug: string): AssetVersion[] {
  return versionsBySlug.get(slug) ?? [];
}

function attachVersions(m: StoredMushaf): MushafDetails {
  return { ...m, versions: getVersions(m.slug) };
}

function toItem(m: StoredMushaf): MushafItem {
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

function findBySlug(slug: string): StoredMushaf | undefined {
  return mushafs.find((m) => m.slug === slug);
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

function applyOrdering(items: StoredMushaf[], ordering?: AssetSortingQuery): StoredMushaf[] {
  if (!ordering) return items;
  const desc = ordering.startsWith('-');
  const field = (desc ? ordering.slice(1) : ordering) as keyof StoredMushaf | 'name';
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

function filterMushafs(filters: MushafFilters): StoredMushaf[] {
  let results = [...mushafs];

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

export function mockGetList(filters: MushafFilters): Observable<MushafsList> {
  const filtered = filterMushafs(filters);
  const start = (filters.page - 1) * filters.page_size;
  const pageItems = filtered.slice(start, start + filters.page_size).map(toItem);
  return withDelay({ results: pageItems, count: filtered.length });
}

export function mockGetDetail(slug: string): Observable<MushafDetails> {
  const item = findBySlug(slug);
  if (!item) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }
  return withDelay(attachVersions(item));
}

export function mockCreate(body: MushafFormValue): Observable<MushafDetails> {
  const baseSlug = slugify(body.name_en || body.name_ar);
  const slug = uniqueSlug(baseSlug);
  const publisher = resolvePublisher(body.publisher_id);
  const created: StoredMushaf = {
    id: nextMushafId++,
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
  mushafs.push(created);
  versionsBySlug.set(slug, []);
  return withDelay(attachVersions(created));
}

export function mockPatch(slug: string, body: Partial<MushafFormValue>): Observable<MushafDetails> {
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
  const idx = mushafs.findIndex((m) => m.slug === slug);
  if (idx === -1) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }
  mushafs.splice(idx, 1);
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
  const mushaf = findBySlug(slug);
  if (!mushaf) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }
  const version: AssetVersion = {
    id: nextVersionId++,
    asset_id: payload.asset_id,
    name: payload.name,
    summary: payload.summary,
    file_url: payload.file
      ? `https://example.com/mushafs/${slug}/${payload.file.name}`
      : `https://example.com/mushafs/${slug}/file`,
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
      ? `https://example.com/mushafs/${slug}/${payload.file.name}`
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
