import {
  UsageComparison,
  UsageFilters,
  UsageGranularity,
  UsageMetric,
  UsagePreset,
} from '../models/usage.models';

const DAY_MS = 86_400_000;
const PRESET_DAYS: Record<Exclude<UsagePreset, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FILTER_PARAMS = ['category', 'channel', 'platform', 'country'] as const;
/** URL parameter -> id filter. */
const ID_PARAMS = [
  ['app', 'app'],
  ['reciter', 'reciter_id'],
  ['riwayah', 'riwayah_id'],
] as const;

export const USAGE_METRICS: UsageMetric[] = [
  'plays',
  'downloads',
  'installs',
  'api_calls',
  'views',
  'requests',
  'bytes',
  'unique_listeners',
  'unique_downloaders',
  'unique_end_users',
  'listening_seconds',
];

/** Dashboard state kept in the URL so reloads and links keep the same view. */
export interface UsageViewState {
  preset: UsagePreset;
  filters: UsageFilters;
  metric: UsageMetric;
  split: string | null;
  compare: UsageComparison;
}

const COMPARISONS: UsageComparison[] = ['previous', 'year', 'hijri_year'];

export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The last N UTC days including `today`. */
export function presetRange(
  preset: Exclude<UsagePreset, 'custom'>,
  today: Date = new Date()
): { start_date: string; end_date: string } {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end.getTime() - (PRESET_DAYS[preset] - 1) * DAY_MS);
  return { start_date: toIsoDay(start), end_date: toIsoDay(end) };
}

export function usageStateFromParams(
  params: Record<string, string | undefined>,
  today: Date = new Date()
): UsageViewState {
  let preset = (params['range'] as UsagePreset) ?? '30d';
  let range: { start_date: string; end_date: string };
  const start = params['start'];
  const end = params['end'];
  if (
    preset === 'custom' &&
    start &&
    end &&
    DATE_RE.test(start) &&
    DATE_RE.test(end) &&
    start <= end
  ) {
    range = { start_date: start, end_date: end };
  } else {
    if (!Object.hasOwn(PRESET_DAYS, preset)) {
      preset = '30d';
    }
    if (preset === 'custom') {
      preset = '30d';
    }
    range = presetRange(preset as Exclude<UsagePreset, 'custom'>, today);
  }
  const filters: UsageFilters = { ...range };
  for (const name of FILTER_PARAMS) {
    if (params[name]) {
      filters[name] = params[name];
    }
  }
  for (const [param, name] of ID_PARAMS) {
    const id = Number(params[param]);
    if (Number.isInteger(id) && id > 0) {
      filters[name] = id;
    }
  }
  const metric = USAGE_METRICS.includes(params['metric'] as UsageMetric)
    ? (params['metric'] as UsageMetric)
    : 'plays';
  const compare = COMPARISONS.includes(params['compare'] as UsageComparison)
    ? (params['compare'] as UsageComparison)
    : 'previous';
  return { preset, filters, metric, split: params['split'] || null, compare };
}

export function usageStateToParams(state: UsageViewState): Record<string, string> {
  const params: Record<string, string> = { range: state.preset };
  if (state.preset === 'custom') {
    params['start'] = state.filters.start_date;
    params['end'] = state.filters.end_date;
  }
  for (const name of FILTER_PARAMS) {
    const value = state.filters[name];
    if (value) {
      params[name] = value;
    }
  }
  for (const [param, name] of ID_PARAMS) {
    const id = state.filters[name];
    if (id) {
      params[param] = String(id);
    }
  }
  params['metric'] = state.metric;
  if (state.split) {
    params['split'] = state.split;
  }
  if (state.compare !== 'previous') {
    params['compare'] = state.compare;
  }
  return params;
}

/** Compact number in the active language; `"<3"` (privacy floor) passes through. */
export function formatCompact(value: number | string | null | undefined, lang: string): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatChange(
  change: number | null | undefined,
  lang: string
): { text: string; direction: 'up' | 'down' | 'flat' } | null {
  if (change === null || change === undefined) {
    return null;
  }
  const text = new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(change);
  return { text, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
}

/** A bucket size that keeps a chart readable for the range. */
export function granularityFor(start: string, end: string): UsageGranularity {
  const days = (Date.parse(end) - Date.parse(start)) / DAY_MS + 1;
  if (days <= 2) {
    return 'hour';
  }
  if (days <= 92) {
    return 'day';
  }
  if (days <= 366) {
    return 'week';
  }
  return 'month';
}

// -- Comparison windows ------------------------------------------------------------------------

const HIJRI_YEAR_DAYS = 354.367;
const HIJRI_PARTS = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

function hijriParts(date: Date): { year: number; month: number; day: number } {
  const parts = Object.fromEntries(
    HIJRI_PARTS.formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    year: parseInt(parts['year'], 10),
    month: Number(parts['month']),
    day: Number(parts['day']),
  };
}

/** The same Gregorian date a year earlier (29 Feb → 28 Feb). */
function lastGregorianYear(date: Date): Date {
  const year = date.getUTCFullYear() - 1;
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

/**
 * The same Umm al-Qura date a Hijri year earlier (e.g. 1 Ramadan 1448 → 1 Ramadan 1447). When
 * that month has no day 30, the month's last day.
 */
function lastHijriYear(date: Date): Date {
  const target = hijriParts(date);
  const guess = date.getTime() - Math.round(HIJRI_YEAR_DAYS) * DAY_MS;
  let fallback: Date | null = null;
  for (let offset = -3; offset <= 3; offset++) {
    const candidate = new Date(guess + offset * DAY_MS);
    const parts = hijriParts(candidate);
    if (parts.year !== target.year - 1 || parts.month !== target.month) {
      continue;
    }
    if (parts.day === target.day) {
      return candidate;
    }
    if (parts.day < target.day && (!fallback || candidate > fallback)) {
      fallback = candidate;
    }
  }
  return fallback ?? new Date(guess);
}

/** The window the trend is compared with, for the year comparisons (`previous` comes from the API). */
export function comparisonRange(
  filters: Pick<UsageFilters, 'start_date' | 'end_date'>,
  compare: Exclude<UsageComparison, 'previous'>
): { start_date: string; end_date: string } {
  const shift = compare === 'year' ? lastGregorianYear : lastHijriYear;
  const day = (value: string) => new Date(`${value}T00:00:00Z`);
  return {
    start_date: toIsoDay(shift(day(filters.start_date))),
    end_date: toIsoDay(shift(day(filters.end_date))),
  };
}
