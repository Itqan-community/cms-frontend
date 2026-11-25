export const SITEMAP_STATIC_ROUTES = ['/gallery', '/reciters', '/content-standards'] as const;

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_CACHE_TTL_MS = 15 * 60_000;
const DEFAULT_RETRY_DELAY_MS = 60_000;

interface ReciterSummary {
  slug?: string | null;
  updated_at?: string | null;
}

interface AssetSummary {
  id?: number | string | null;
  publisher?: { id?: number | string | null } | null;
}

interface PaginatedResponse<T> {
  count?: number;
  results?: T[];
}

export function xmlEscape(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function alternateLinks(siteUrl: string, path: string): string[] {
  const ar = `${siteUrl}${path}`;
  const en = `${ar}?lang=en`;
  return (
    [
      ['ar', ar],
      ['en', en],
      ['x-default', ar],
    ] as const
  ).map(
    ([lang, href]) =>
      `    <xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(href)}"/>`
  );
}

function urlEntries(
  siteUrl: string,
  entry: { path: string; lastmod?: string | null; changefreq?: string }
): string[] {
  return [`${siteUrl}${entry.path}`, `${siteUrl}${entry.path}?lang=en`].map((loc) => {
    const lines = ['  <url>', `    <loc>${xmlEscape(loc)}</loc>`];
    if (entry.lastmod) {
      lines.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`);
    }
    if (entry.changefreq) {
      lines.push(`    <changefreq>${xmlEscape(entry.changefreq)}</changefreq>`);
    }
    lines.push(...alternateLinks(siteUrl, entry.path), '  </url>');
    return lines.join('\n');
  });
}

async function fetchAll<T>(
  apiBaseUrl: string,
  endpoint: string,
  fetchImpl: typeof fetch
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  const base = apiBaseUrl.replace(/\/+$/, '');

  for (;;) {
    const url = `${base}/${endpoint}/?page=${page}&page_size=${DEFAULT_PAGE_SIZE}`;
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${endpoint} API responded with ${response.status}`);
    }

    const data = (await response.json()) as PaginatedResponse<T>;
    const results = Array.isArray(data.results) ? data.results : [];
    items.push(...results);

    const count = typeof data.count === 'number' ? data.count : items.length;
    if (items.length >= count || results.length === 0) {
      break;
    }
    page += 1;
  }

  return items;
}

async function fetchEndpoint<T>(
  apiBaseUrl: string,
  endpoint: string,
  fetchImpl: typeof fetch
): Promise<{ items: T[]; ok: boolean }> {
  try {
    return { items: await fetchAll<T>(apiBaseUrl, endpoint, fetchImpl), ok: true };
  } catch (err) {
    console.warn(`dynamic-sitemap: could not fetch ${endpoint}`, err);
    return { items: [], ok: false };
  }
}

export async function buildSitemapXml(
  apiBaseUrl: string,
  siteUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ xml: string; complete: boolean }> {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const [recitersRes, assetsRes] = await Promise.all([
    fetchEndpoint<ReciterSummary>(apiBaseUrl, 'reciters', fetchImpl),
    fetchEndpoint<AssetSummary>(apiBaseUrl, 'assets', fetchImpl),
  ]);

  const publisherIds = [
    ...new Set(
      assetsRes.items
        .map((asset) => asset.publisher?.id)
        .filter((id): id is string | number => id != null && String(id).trim() !== '')
    ),
  ];

  const entries = [
    ...SITEMAP_STATIC_ROUTES.flatMap((path) =>
      urlEntries(cleanSiteUrl, { path, changefreq: 'weekly' })
    ),
    ...recitersRes.items
      .filter((r) => r?.slug != null && String(r.slug).trim() !== '')
      .flatMap((reciter) =>
        urlEntries(cleanSiteUrl, {
          path: `/reciters/${encodeURIComponent(String(reciter.slug).trim())}`,
          lastmod: reciter.updated_at,
          changefreq: 'weekly',
        })
      ),
    ...assetsRes.items
      .filter((a) => a?.id != null && String(a.id).trim() !== '')
      .flatMap((asset) =>
        urlEntries(cleanSiteUrl, {
          path: `/gallery/asset/${encodeURIComponent(String(asset.id).trim())}`,
          changefreq: 'weekly',
        })
      ),
    ...publisherIds.flatMap((id) =>
      urlEntries(cleanSiteUrl, {
        path: `/publisher/${encodeURIComponent(String(id).trim())}`,
        changefreq: 'weekly',
      })
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
  return { xml, complete: recitersRes.ok && assetsRes.ok };
}

export interface CachedSitemapLoaderOptions {
  apiBaseUrl: string;
  siteUrl: string;
  ttlMs?: number;
  /** After a failed or partial refresh, the fallback is served this long before fetching again. */
  retryDelayMs?: number;
  readFallback?: () => string | null;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export function createCachedSitemapLoader(options: CachedSitemapLoaderOptions): {
  get(): Promise<string | null>;
} {
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => Date.now());

  let cache: { xml: string; expiresAt: number } | null = null;
  let fallback: { xml: string | null; retryAt: number } | null = null;
  let inFlight: Promise<string | null> | null = null;

  const serveFallback = (xml: string | null): string | null => {
    fallback = { xml, retryAt: now() + retryDelayMs };
    return xml;
  };

  return {
    get(): Promise<string | null> {
      if (cache && now() < cache.expiresAt) {
        return Promise.resolve(cache.xml);
      }
      if (fallback && now() < fallback.retryAt) {
        return Promise.resolve(fallback.xml);
      }
      if (inFlight) {
        return inFlight;
      }

      inFlight = (async () => {
        try {
          const { xml, complete } = await buildSitemapXml(
            options.apiBaseUrl,
            options.siteUrl,
            fetchImpl
          );
          if (complete) {
            cache = { xml, expiresAt: now() + ttlMs };
            fallback = null;
            return xml;
          }
          // A partial refresh never replaces a complete sitemap; it is served only when there is
          // no complete one to fall back to.
          if (cache) {
            return serveFallback(cache.xml);
          }
          return serveFallback(options.readFallback?.() || xml);
        } catch (err) {
          console.error('dynamic-sitemap: unexpected failure', err);
          return serveFallback(cache?.xml ?? options.readFallback?.() ?? null);
        } finally {
          inFlight = null;
        }
      })();

      return inFlight;
    },
  };
}
