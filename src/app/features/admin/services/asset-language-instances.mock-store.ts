import type {
  AssetContentLanguageKind,
  AssetLanguageInstance,
  AssetLanguageInstanceWriteIn,
} from '../models/asset-language-instance.models';

const stores = new Map<string, AssetLanguageInstance[]>();
let nextId = 1;

function storeKey(kind: AssetContentLanguageKind, slug: string): string {
  return `${kind}:${slug}`;
}

function slugify(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function mockListLanguageInstances(
  kind: AssetContentLanguageKind,
  slug: string
): AssetLanguageInstance[] {
  const key = storeKey(kind, slug);
  if (!stores.has(key)) {
    const now = new Date().toISOString();
    stores.set(key, [
      {
        id: nextId++,
        language_code: 'ar',
        name: 'Arabic',
        slug: 'ar',
        is_default: true,
        is_visible: true,
        entries_count: 6236,
        created_at: now,
        updated_at: now,
      },
    ]);
  }
  return [...(stores.get(key) ?? [])];
}

export function mockCreateLanguageInstance(
  kind: AssetContentLanguageKind,
  slug: string,
  body: AssetLanguageInstanceWriteIn
): AssetLanguageInstance {
  const list = mockListLanguageInstances(kind, slug);
  const code = body.language_code.trim().toLowerCase();
  if (list.some((l) => l.language_code === code)) {
    throw new Error('LANGUAGE_EXISTS');
  }
  const now = new Date().toISOString();
  const instance: AssetLanguageInstance = {
    id: nextId++,
    language_code: code,
    name: body.name?.trim() || code.toUpperCase(),
    slug: slugify(code),
    is_default: false,
    is_visible: body.is_visible !== false,
    entries_count: 0,
    created_at: now,
    updated_at: now,
  };
  list.push(instance);
  return instance;
}

export function mockPatchLanguageInstance(
  kind: AssetContentLanguageKind,
  slug: string,
  langSlug: string,
  body: Partial<AssetLanguageInstanceWriteIn>
): AssetLanguageInstance {
  const list = mockListLanguageInstances(kind, slug);
  const idx = list.findIndex((l) => l.slug === langSlug);
  if (idx < 0) throw new Error('NOT_FOUND');
  const current = list[idx];
  if (body.is_default === true) {
    list.forEach((l, i) => {
      list[i] = { ...l, is_default: l.slug === langSlug };
    });
  }
  const updated: AssetLanguageInstance = {
    ...current,
    name: body.name?.trim() || current.name,
    is_visible: body.is_visible !== undefined ? body.is_visible : current.is_visible,
    is_default: body.is_default === true ? true : current.is_default,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  return updated;
}

export function mockDeleteLanguageInstance(
  kind: AssetContentLanguageKind,
  slug: string,
  langSlug: string
): void {
  const list = mockListLanguageInstances(kind, slug);
  const instance = list.find((l) => l.slug === langSlug);
  if (!instance) throw new Error('NOT_FOUND');
  if (instance.is_default) throw new Error('CANNOT_DELETE_DEFAULT');
  const filtered = list.filter((l) => l.slug !== langSlug);
  stores.set(storeKey(kind, slug), filtered);
}
