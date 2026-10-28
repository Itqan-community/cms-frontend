import { surahLabel } from '../../admin/models/quran-metadata';
import { USAGE_OTHER_KEY, UsageDimension, UsageMetric, UsageScope } from '../models/usage.models';

/** Headline cards: a metric, the integrating apps or the share of the current version. */
export type UsageHeadline = UsageMetric | 'integrating_apps' | 'latest_version_share';

export interface UsagePanel {
  by: UsageDimension;
  chart: 'donut' | 'bar' | 'heatmap';
  limit: number;
}

/** What a dashboard shows for a scope and (on asset pages) an asset category (spec §8 headlines). */
export interface DashboardProfile {
  headline: UsageHeadline[];
  metrics: UsageMetric[];
  defaultMetric: UsageMetric;
  splits: UsageDimension[];
  panels: UsagePanel[];
  showCategoryFilter: boolean;
  showAppFilter: boolean;
  showExport: boolean;
  /** Recitation reports: listener growth, cohorts, spread, funnel (and catalog sections). */
  recitation: boolean;
  /** Reciter and riwayah filters (recitation overview). */
  showReciterFilters: boolean;
}

const TEXT_CATEGORIES = new Set(['tafsir', 'translation', 'linguistic', 'tajweed']);
const ALL_METRICS: UsageMetric[] = [
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
const FILE_METRICS: UsageMetric[] = [
  'downloads',
  'installs',
  'unique_downloaders',
  'api_calls',
  'requests',
  'bytes',
];
const FILE_HEADLINE: UsageHeadline[] = [
  'downloads',
  'installs',
  'unique_downloaders',
  'latest_version_share',
];

const bar = (by: UsageDimension, limit = 10): UsagePanel => ({ by, chart: 'bar', limit });
const donut = (by: UsageDimension): UsagePanel => ({ by, chart: 'donut', limit: 10 });

export function dashboardProfile(
  scope: UsageScope,
  category: string | null | undefined,
  assetId: number | null | undefined
): DashboardProfile {
  const base = {
    showCategoryFilter: false,
    showAppFilter: false,
    showExport: scope !== 'developer',
    recitation: false,
    showReciterFilters: false,
  };
  if (assetId != null) {
    if (category === 'recitation') {
      return {
        ...base,
        recitation: true,
        headline: ['plays', 'unique_listeners', 'listening_seconds', 'integrating_apps'],
        metrics: [
          'plays',
          'unique_listeners',
          'listening_seconds',
          'api_calls',
          'requests',
          'bytes',
        ],
        defaultMetric: 'plays',
        splits: ['channel', 'platform', 'country', 'app'],
        panels: [
          bar('surah', 114),
          { by: 'hour_of_week', chart: 'heatmap', limit: 168 },
          bar('app'),
          bar('country'),
          donut('platform'),
        ],
      };
    }
    const text = TEXT_CATEGORIES.has(category ?? '');
    return {
      ...base,
      headline: FILE_HEADLINE,
      metrics: FILE_METRICS,
      defaultMetric: 'downloads',
      splits: text
        ? ['version', 'language', 'channel', 'country']
        : ['version', 'channel', 'platform', 'country'],
      panels: text
        ? [bar('version'), donut('language'), donut('channel'), bar('country')]
        : [bar('version'), donut('channel'), donut('platform'), bar('country')],
    };
  }
  if (category === 'recitation' && scope !== 'developer') {
    return {
      ...base,
      showCategoryFilter: true,
      recitation: true,
      showReciterFilters: true,
      headline: ['plays', 'unique_listeners', 'listening_seconds', 'integrating_apps'],
      metrics: ['plays', 'unique_listeners', 'listening_seconds', 'api_calls', 'requests', 'bytes'],
      defaultMetric: 'plays',
      splits: ['reciter', 'riwayah', 'asset', 'channel', 'platform', 'country', 'app'],
      panels: [
        bar('reciter'),
        bar('surah', 20),
        bar('asset'),
        bar('country'),
        bar('app'),
        donut('platform'),
      ],
    };
  }
  if (scope === 'developer') {
    return {
      ...base,
      showAppFilter: true,
      headline: ['api_calls', 'plays', 'downloads', 'unique_end_users', 'unique_listeners'],
      metrics: [
        'api_calls',
        'plays',
        'downloads',
        'installs',
        'requests',
        'bytes',
        'unique_end_users',
        'unique_listeners',
      ],
      defaultMetric: 'api_calls',
      splits: ['app', 'endpoint', 'country', 'platform'],
      panels: [bar('app'), bar('endpoint'), bar('asset'), bar('country')],
    };
  }
  return {
    ...base,
    showCategoryFilter: true,
    headline: [
      'plays',
      'downloads',
      'installs',
      'api_calls',
      'unique_listeners',
      'integrating_apps',
    ],
    metrics: ALL_METRICS,
    defaultMetric: 'plays',
    splits: ['channel', 'platform', 'country', 'asset', 'app', 'kind'],
    panels: [donut('channel'), donut('platform'), bar('country'), bar('asset'), bar('app')],
  };
}

type Translate = (key: string, params?: Record<string, unknown>) => string;

function displayName(type: 'region' | 'language', code: string, lang: string): string | undefined {
  try {
    const name = new Intl.DisplayNames([lang === 'ar' ? 'ar' : 'en'], { type }).of(code);
    return name && name !== code ? name : undefined;
  } catch {
    return undefined;
  }
}

/** Human label for a breakdown or split key. */
export function itemLabel(
  by: UsageDimension | string,
  key: string,
  label: string | null,
  t: Translate,
  lang: string
): string {
  if (key === USAGE_OTHER_KEY) {
    return t('USAGE.OTHER');
  }
  if (key === '') {
    return t(by === 'app' ? 'USAGE.NO_APP' : 'USAGE.UNKNOWN');
  }
  if (label) {
    return label;
  }
  switch (by) {
    case 'country':
      return key === 'XX' ? t('USAGE.UNKNOWN') : (displayName('region', key, lang) ?? key);
    case 'language':
      return displayName('language', key, lang) ?? key;
    case 'channel':
      return t(`USAGE.CHANNELS.${key}`);
    case 'platform':
      return t(`USAGE.PLATFORMS.${key}`);
    case 'kind':
      return t(`USAGE.KINDS.${key}`);
    case 'surah':
      return surahLabel(Number(key), lang === 'ar');
    default:
      return key;
  }
}
