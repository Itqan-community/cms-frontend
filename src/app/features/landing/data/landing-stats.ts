import stats from './landing-stats.json';

/** Catalogue counts baked in at build time by scripts/generate-landing-stats.mjs. */
export interface LandingStats {
  asOf: string;
  assets: number;
  publishers: number;
  recitations: number;
  reciters: number;
  mushafs: number;
  fonts: number;
  tafsirs: number;
  translations: number;
  packages: number;
}

export const LANDING_STATS: LandingStats = stats;

/** "26 November 2026" / "26 نوفمبر 2026" (Latin digits, as in the rest of the site). */
export function formatStatsDate(asOf: string, lang: string): string {
  const date = new Date(`${asOf}T00:00:00Z`);
  const locale = lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
