// Writes dist/browser/sitemap.xml, but only for the `production` Netlify
// context — same CONTEXT-gating approach as generate-robots.mjs, so PR
// previews and non-production branch deploys never ship a sitemap pointing
// at content that may not exist there.
//
// Reciter, asset and publisher entries are fetched from the live production
// API at build time (publishers come from the assets list: there is no public
// publishers list, and a publisher page without assets isn't worth indexing).
// If a request fails we log a warning and still write a valid sitemap with
// what we have — a missing/incomplete backend must never fail the production
// build. Every URL lists its Arabic (default, no query) and English
// (`?lang=en`) versions as hreflang alternates, matching SeoService.
import { writeFileSync } from 'node:fs';

const context = process.env.CONTEXT ?? 'local';
const outPath = 'dist/browser/sitemap.xml';
const SITE_URL = 'https://cms.itqan.dev';
const API_BASE_URL = 'https://api.cms.itqan.dev/cms-api';
const PAGE_SIZE = 100;

const STATIC_ROUTES = ['/gallery', '/publishers', '/reciters', '/content-standards'];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function alternateLinks(path) {
  const ar = `${SITE_URL}${path}`;
  const en = `${ar}?lang=en`;
  return [
    ['ar', ar],
    ['en', en],
    ['x-default', ar],
  ].map(
    ([lang, href]) =>
      `    <xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(href)}"/>`
  );
}

/** One <url> per language, each listing both versions (Google's hreflang sitemap format). */
function urlEntries({ path, lastmod, changefreq }) {
  return [`${SITE_URL}${path}`, `${SITE_URL}${path}?lang=en`].map((loc) => {
    const lines = [`  <url>`, `    <loc>${xmlEscape(loc)}</loc>`];
    if (lastmod) {
      lines.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`);
    }
    if (changefreq) {
      lines.push(`    <changefreq>${xmlEscape(changefreq)}</changefreq>`);
    }
    lines.push(...alternateLinks(path), `  </url>`);
    return lines.join('\n');
  });
}

/** Every item of a paginated `{count, results}` list endpoint. */
async function fetchAll(endpoint) {
  const items = [];
  let page = 1;

  for (;;) {
    const url = `${API_BASE_URL}/${endpoint}/?page=${page}&page_size=${PAGE_SIZE}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      throw new Error(`${endpoint} API responded with ${response.status}`);
    }

    const data = await response.json();
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

async function fetchOrEmpty(endpoint) {
  try {
    return await fetchAll(endpoint);
  } catch (error) {
    console.warn(
      `generate-sitemap: could not fetch ${endpoint}, leaving them out. Reason: ${error.message}`
    );
    return [];
  }
}

async function main() {
  if (context !== 'production') {
    console.log(`generate-sitemap: skipping for context "${context}" (production only)`);
    return;
  }

  const [reciters, assets] = await Promise.all([fetchOrEmpty('reciters'), fetchOrEmpty('assets')]);
  const publisherIds = [
    ...new Set(assets.map((asset) => asset.publisher?.id).filter((id) => id != null)),
  ];

  const entries = [
    ...STATIC_ROUTES.flatMap((path) => urlEntries({ path, changefreq: 'weekly' })),
    ...reciters.flatMap((reciter) =>
      urlEntries({
        path: `/reciters/${reciter.slug}`,
        lastmod: reciter.updated_at,
        changefreq: 'weekly',
      })
    ),
    ...assets.flatMap((asset) =>
      urlEntries({ path: `/gallery/asset/${asset.id}`, changefreq: 'weekly' })
    ),
    ...publisherIds.flatMap((id) => urlEntries({ path: `/publisher/${id}`, changefreq: 'weekly' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;

  writeFileSync(outPath, xml);
  console.log(
    `generate-sitemap: wrote ${outPath}: ${STATIC_ROUTES.length} static, ${reciters.length} reciter, ${assets.length} asset and ${publisherIds.length} publisher pages (ar + en)`
  );
}

main().catch((error) => {
  console.error('generate-sitemap: unexpected failure, sitemap not written.', error);
});
