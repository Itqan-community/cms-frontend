import { UsageFilters, UsageGranularity, UsageMetric, UsagePreset } from '../models/usage.models';

const DAY_MS = 86_400_000;
const PRESET_DAYS: Record<Exclude<UsagePreset, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FILTER_PARAMS = ['category', 'channel', 'platform', 'country'] as const;

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
];

/** Dashboard state kept in the URL so reloads and links keep the same view. */
export interface UsageViewState {
  preset: UsagePreset;
  filters: UsageFilters;
  metric: UsageMetric;
  split: string | null;
}

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
    if (!(preset in PRESET_DAYS)) {
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
  const metric = USAGE_METRICS.includes(params['metric'] as UsageMetric)
    ? (params['metric'] as UsageMetric)
    : 'plays';
  return { preset, filters, metric, split: params['split'] || null };
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
  params['metric'] = state.metric;
  if (state.split) {
    params['split'] = state.split;
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
