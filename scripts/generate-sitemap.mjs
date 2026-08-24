// Writes dist/browser/sitemap.xml, but only for the `production` Netlify
// context — same CONTEXT-gating approach as generate-robots.mjs, so PR
// previews and non-production branch deploys never ship a sitemap pointing
// at content that may not exist there.
//
// Reciter entries are fetched from the live production reciters API at
// build time. If that request fails (e.g. the endpoint isn't deployed yet),
// we log a warning and still write a valid sitemap containing the static
// routes — a missing/incomplete backend must never fail the production build.
import { writeFileSync } from 'node:fs';

const context = process.env.CONTEXT ?? 'local';
const outPath = 'dist/browser/sitemap.xml';
const SITE_URL = 'https://cms.itqan.dev';
const API_BASE_URL = 'https://api.cms.itqan.dev/cms-api';
const RECITERS_PAGE_SIZE = 100;

const STATIC_ROUTES = ['/', '/gallery', '/publishers', '/reciters'];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod, changefreq }) {
  const lines = [`  <url>`, `    <loc>${xmlEscape(loc)}</loc>`];
  if (lastmod) {
    lines.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`);
  }
  if (changefreq) {
    lines.push(`    <changefreq>${xmlEscape(changefreq)}</changefreq>`);
  }
  lines.push(`  </url>`);
  return lines.join('\n');
}

async function fetchAllReciters() {
  const reciters = [];
  let page = 1;

  for (;;) {
    const url = `${API_BASE_URL}/reciters/?page=${page}&page_size=${RECITERS_PAGE_SIZE}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      throw new Error(`reciters API responded with ${response.status}`);
    }

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    reciters.push(...results);

    const count = typeof data.count === 'number' ? data.count : reciters.length;
    if (reciters.length >= count || results.length === 0) {
      break;
    }
    page += 1;
  }

  return reciters;
}

async function main() {
  if (context !== 'production') {
    console.log(`generate-sitemap: skipping for context "${context}" (production only)`);
    return;
  }

  let reciters = [];
  try {
    reciters = await fetchAllReciters();
  } catch (error) {
    console.warn(
      `generate-sitemap: could not fetch reciters, writing sitemap with static routes only. Reason: ${error.message}`
    );
  }

  const entries = [
    ...STATIC_ROUTES.map((path) => urlEntry({ loc: `${SITE_URL}${path}`, changefreq: 'weekly' })),
    ...reciters.map((reciter) =>
      urlEntry({
        loc: `${SITE_URL}/reciters/${reciter.slug}`,
        lastmod: reciter.updated_at,
        changefreq: 'weekly',
      })
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  writeFileSync(outPath, xml);
  console.log(
    `generate-sitemap: wrote ${outPath} with ${STATIC_ROUTES.length} static routes and ${reciters.length} reciter routes`
  );
}

main().catch((error) => {
  console.error('generate-sitemap: unexpected failure, sitemap not written.', error);
});
