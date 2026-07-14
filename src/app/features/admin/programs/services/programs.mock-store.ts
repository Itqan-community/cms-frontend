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
  ProgramDetails,
  ProgramFilters,
  ProgramFormValue,
  ProgramItem,
  ProgramsList,
  PublisherRef,
} from '../models/programs.models';

const MOCK_DELAY_MS = 300;

interface StoredProgram extends ProgramDetails {
  publisher_id: number;
}

let nextProgramId = 5;
let nextVersionId = 400;

const publishers: PublisherRef[] = [
  { id: 1, name: 'King Fahd Complex' },
  { id: 2, name: 'Itqan' },
  { id: 3, name: 'Quran Academy' },
];

const programs: StoredProgram[] = [
  {
    id: 1,
    slug: 'quran-reader-app',
    name_ar: 'تطبيق قارئ القرآن',
    name_en: 'Quran Reader App',
    description_ar: 'تطبيق لقراءة وتصفح المصحف الشريف مع بحث وتفسير.',
    description_en: 'Application for reading and browsing the Quran with search and tafsir.',
    long_description_ar: 'تطبيق متعدد المنصات لعرض المصحف مع دعم الإشارات المرجعية والتظليل.',
    long_description_en:
      'Cross-platform app for Quran display with bookmarks, highlighting, and navigation.',
    thumbnail_url: null,
    publisher: publishers[1],
    publisher_id: 2,
    license: 'CC0',
    language: 'ar',
    is_external: false,
    is_open_access: true,
    restricted_for_tenant: false,
    external_url: null,
    versions: [],
    created_at: '2024-01-20T10:00:00Z',
  },
  {
    id: 2,
    slug: 'tajweed-studio',
    name_ar: 'استوديو التجويد',
    name_en: 'Tajweed Studio',
    description_ar: 'أداة لتعلم أحكام التجويد مع تمارين تفاعلية.',
    description_en: 'Tool for learning tajweed rules with interactive exercises.',
    long_description_ar: 'برنامج تعليمي يعرض قواعد التجويد مع أمثلة صوتية ومرئية.',
    long_description_en:
      'Educational software presenting tajweed rules with audio and visual examples.',
    thumbnail_url: null,
    publisher: publishers[2],
    publisher_id: 3,
    license: 'CC-BY',
    language: 'ar',
    is_external: false,
    is_open_access: false,
    restricted_for_tenant: false,
    external_url: null,
    versions: [],
    created_at: '2024-03-12T14:30:00Z',
  },
  {
    id: 3,
    slug: 'itqan-api-sdk',
    name_ar: 'حزمة تطوير Itqan API',
    name_en: 'Itqan API SDK',
    description_ar: 'مكتبة برمجية للوصول إلى أصول القرآن عبر واجهة Itqan.',
    description_en: 'Software library for accessing Quranic assets via the Itqan API.',
    long_description_ar: 'SDK رسمي للمطورين مع أمثلة بلغات متعددة وتوثيق كامل.',
    long_description_en:
      'Official developer SDK with multi-language examples and full documentation.',
    thumbnail_url: null,
    publisher: publishers[1],
    publisher_id: 2,
    license: 'CC-BY-SA',
    language: 'en',
    is_external: true,
    is_open_access: false,
    restricted_for_tenant: true,
    external_url: 'https://docs.cms.itqan.dev',
    versions: [],
    created_at: '2024-06-01T09:15:00Z',
  },
];

const versionsBySlug = new Map<string, AssetVersion[]>([
  [
    'quran-reader-app',
    [
      {
        id: 401,
        asset_id: 1,
        name: 'v3.2 — Android APK',
        summary: 'Android release build',
        file_url: 'https://example.com/programs/quran-reader-v3.2.apk',
        size_bytes: 28_000_000,
        created_at: '2024-02-01T08:00:00Z',
      },
    ],
  ],
  [
    'itqan-api-sdk',
    [
      {
        id: 402,
        asset_id: 3,
        name: 'v1.0 — npm package',
        summary: 'TypeScript SDK tarball',
        file_url: 'https://example.com/programs/itqan-sdk-v1.0.tgz',
        size_bytes: 450_000,
        created_at: '2024-06-10T12:00:00Z',
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
  return base || `program-${nextProgramId}`;
}

function uniqueSlug(base: string, excludeId?: number): string {
  let slug = base;
  let n = 2;
  while (programs.some((m) => m.slug === slug && m.id !== excludeId)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function getVersions(slug: string): AssetVersion[] {
  return versionsBySlug.get(slug) ?? [];
}

function attachVersions(m: StoredProgram): ProgramDetails {
  return { ...m, versions: getVersions(m.slug) };
}

function toItem(m: StoredProgram): ProgramItem {
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

function findBySlug(slug: string): StoredProgram | undefined {
  return programs.find((m) => m.slug === slug);
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

function applyOrdering(items: StoredProgram[], ordering?: AssetSortingQuery): StoredProgram[] {
  if (!ordering) return items;
  const desc = ordering.startsWith('-');
  const field = (desc ? ordering.slice(1) : ordering) as keyof StoredProgram | 'name';
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

function filterPrograms(filters: ProgramFilters): StoredProgram[] {
  let results = [...programs];

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

export function mockGetList(filters: ProgramFilters): Observable<ProgramsList> {
  const filtered = filterPrograms(filters);
  const start = (filters.page - 1) * filters.page_size;
  const pageItems = filtered.slice(start, start + filters.page_size).map(toItem);
  return withDelay({ results: pageItems, count: filtered.length });
}

export function mockGetDetail(slug: string): Observable<ProgramDetails> {
  const item = findBySlug(slug);
  if (!item) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }
  return withDelay(attachVersions(item));
}

export function mockCreate(body: ProgramFormValue): Observable<ProgramDetails> {
  const baseSlug = slugify(body.name_en || body.name_ar);
  const slug = uniqueSlug(baseSlug);
  const publisher = resolvePublisher(body.publisher_id);
  const created: StoredProgram = {
    id: nextProgramId++,
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
  programs.push(created);
  versionsBySlug.set(slug, []);
  return withDelay(attachVersions(created));
}

export function mockPatch(
  slug: string,
  body: Partial<ProgramFormValue>
): Observable<ProgramDetails> {
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
  const idx = programs.findIndex((m) => m.slug === slug);
  if (idx === -1) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }
  programs.splice(idx, 1);
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
  const program = findBySlug(slug);
  if (!program) {
    return throwError(() => ({ status: 404, message: 'Not found' }));
  }
  const version: AssetVersion = {
    id: nextVersionId++,
    asset_id: payload.asset_id,
    name: payload.name,
    summary: payload.summary,
    file_url: payload.file
      ? `https://example.com/programs/${slug}/${payload.file.name}`
      : `https://example.com/programs/${slug}/file`,
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
      ? `https://example.com/programs/${slug}/${payload.file.name}`
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
