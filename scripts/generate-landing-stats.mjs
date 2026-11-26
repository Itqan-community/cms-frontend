// Bakes the landing-page counts into src/app/features/landing/data/landing-stats.json before each
// build (npm "prebuild"), so the pages show real numbers without an API call at load time.
//
// Counts come from the production catalogue (the cms-api gallery list and the public /packages/
// registry). If a request fails, the committed file is kept as is: a slow or missing backend must
// never fail the build. Locally the file is only rewritten when a count changed, so a dev build
// doesn't leave a diff just for a new date; in CI it is always rewritten with the build date.
import { readFileSync, writeFileSync } from 'node:fs';

const API_BASE_URL = process.env.LANDING_STATS_API_URL ?? 'https://api.cms.itqan.dev';
const OUT_PATH = 'src/app/features/landing/data/landing-stats.json';
const PAGE_SIZE = 100;
const TIMEOUT_MS = 15000;

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

async function fetchAllAssets() {
  const assets = [];
  for (let page = 1; ; page++) {
    const body = await getJson(
      `${API_BASE_URL}/cms-api/assets/?page=${page}&page_size=${PAGE_SIZE}`
    );
    assets.push(...body.results);
    if (assets.length >= body.count || body.results.length === 0) return assets;
  }
}

function hasTag(asset, slug) {
  return (asset.tags ?? []).some((t) => t.slug === slug);
}

function countStats(assets, packagesCount) {
  const byCategory = (c) => assets.filter((a) => a.category === c);
  const recitations = byCategory('recitation');
  const text = byCategory('text');
  return {
    assets: assets.length,
    publishers: new Set(assets.map((a) => a.publisher?.id).filter(Boolean)).size,
    recitations: recitations.length,
    reciters: new Set(recitations.map((a) => a.reciter?.id).filter(Boolean)).size,
    mushafs: byCategory('mushaf').length,
    fonts: byCategory('font').length,
    tafsirs: text.filter((a) => hasTag(a, 'tafsir')).length,
    translations: text.filter((a) => hasTag(a, 'translation')).length,
    packages: packagesCount,
  };
}

function readCurrent() {
  try {
    return JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const current = readCurrent();
  let counts;
  try {
    const [assets, packages] = await Promise.all([
      fetchAllAssets(),
      getJson(`${API_BASE_URL}/packages/?page_size=1`),
    ]);
    counts = countStats(assets, packages.count);
  } catch (err) {
    console.warn(`[landing-stats] kept the committed counts: ${err.message}`);
    return;
  }

  const { asOf: _asOf, ...currentCounts } = current ?? {};
  const unchanged = JSON.stringify(currentCounts) === JSON.stringify(counts);
  if (unchanged && !process.env.CI) {
    console.log('[landing-stats] counts unchanged');
    return;
  }
  const asOf = new Date().toISOString().slice(0, 10);
  writeFileSync(OUT_PATH, `${JSON.stringify({ asOf, ...counts }, null, 2)}\n`);
  console.log(`[landing-stats] wrote ${OUT_PATH} (${asOf})`);
}

await main();
