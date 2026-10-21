/**
 * Usage reports API contract (backend `apps/usage_tracking/api/usage_schemas.py`).
 */

/** Who the report is for: `/portal/usage/`, `/portal/admin/usage/` or `/cms-api/developers/usage/`. */
export type UsageScope = 'publisher' | 'admin' | 'developer';

export type UsageMetric =
  | 'plays'
  | 'downloads'
  | 'installs'
  | 'api_calls'
  | 'requests'
  | 'bytes'
  | 'unique_listeners'
  | 'unique_downloaders'
  | 'unique_end_users'
  | 'views';

export type UsageGranularity = 'hour' | 'day' | 'week' | 'month';

export type UsageDimension =
  | 'asset'
  | 'surah'
  | 'country'
  | 'channel'
  | 'platform'
  | 'app'
  | 'version'
  | 'language'
  | 'kind'
  | 'endpoint'
  | 'hour_of_week'
  | 'publisher';

export type UsagePreset = '7d' | '30d' | '90d' | '12m' | 'custom';

/** Report filters; dates are inclusive UTC days (`YYYY-MM-DD`). */
export interface UsageFilters {
  start_date: string;
  end_date: string;
  asset_id?: number | null;
  category?: string | null;
  channel?: string | null;
  platform?: string | null;
  country?: string | null;
  app?: number | null;
  /** Admin scope only. */
  publisher_id?: number | null;
}

export interface MetricValue {
  value: number | null;
  previous: number | null;
  /** (value − previous) ÷ previous; null when previous is 0. */
  change: number | null;
}

export interface UsageDisclaimer {
  code: string;
  text: string;
}

export interface UsageSummary {
  period: { start_date: string; end_date: string };
  previous_period: { start_date: string; end_date: string };
  metrics: Record<UsageMetric, MetricValue>;
  integrating_apps: MetricValue;
  unidentified_apps: boolean;
  latest_version_share: number | null;
  uniques_basis: 'events' | 'monthly' | 'unavailable';
  definitions: Partial<Record<UsageMetric, string>>;
  disclaimers: UsageDisclaimer[];
  data_updated_at: string | null;
}

export interface UsagePoint {
  t: string;
  value: number | null;
}

export interface UsageSeries {
  /** `all` without a split; `__other__` for the folded rest; `""` for rows without a value. */
  key: string;
  label: string | null;
  points: UsagePoint[];
}

export interface UsageTimeseries {
  metric: UsageMetric;
  granularity: UsageGranularity;
  series: UsageSeries[];
  previous: UsagePoint[] | null;
  data_updated_at: string | null;
}

export interface UsageBreakdownItem {
  key: string;
  label: string | null;
  /** `"<3"` where the developer privacy floor hides a small number. */
  value: number | string;
  previous: number | null;
}

export interface UsageBreakdown {
  metric: UsageMetric;
  by: UsageDimension;
  items: UsageBreakdownItem[];
  other: number | null;
  total: number | null;
  data_updated_at: string | null;
}

export interface ReconciliationNumbers {
  reads: number;
  edge_requests: number;
  unseen: number;
}

export interface UsageReconciliation {
  total: ReconciliationNumbers;
  assets: (ReconciliationNumbers & { key: string; label: string | null })[];
  days: (ReconciliationNumbers & { t: string })[];
  data_updated_at: string | null;
}

export interface PublicUsageCounts {
  plays: number;
  downloads: number;
  apps: number;
  disclaimers: UsageDisclaimer[];
  data_updated_at: string | null;
}

export interface TimeseriesOptions {
  metric: UsageMetric;
  granularity: UsageGranularity;
  split_by?: UsageDimension | null;
  top?: number;
  compare?: boolean;
}

export interface BreakdownOptions {
  metric: UsageMetric;
  by: UsageDimension;
  limit?: number;
  compare?: boolean;
  tz?: string;
}

/** Key the API uses for the folded rest of a split series. */
export const USAGE_OTHER_KEY = '__other__';
