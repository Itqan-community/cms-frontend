import { dashboardProfile, itemLabel } from './usage-dashboard.profile';

describe('dashboardProfile', () => {
  it('portal dashboards lead with plays and offer category filters and export', () => {
    const profile = dashboardProfile('publisher', null, null);
    expect(profile.defaultMetric).toBe('plays');
    expect(profile.headline).toContain('integrating_apps');
    expect(profile.showCategoryFilter).toBeTrue();
    expect(profile.showExport).toBeTrue();
    expect(profile.panels.map((panel) => panel.by)).toEqual([
      'channel',
      'platform',
      'country',
      'asset',
      'app',
    ]);
  });

  it('recitation assets show listeners, surahs and the hour-of-week heatmap', () => {
    const profile = dashboardProfile('publisher', 'recitation', 7);
    expect(profile.headline).toEqual([
      'plays',
      'unique_listeners',
      'listening_seconds',
      'integrating_apps',
    ]);
    expect(profile.recitation).toBeTrue();
    expect(profile.showReciterFilters).toBeFalse();
    expect(profile.panels.map((panel) => panel.by)).toContain('surah');
    expect(profile.panels.find((panel) => panel.by === 'hour_of_week')?.chart).toBe('heatmap');
    expect(profile.showCategoryFilter).toBeFalse();
  });

  it('the recitation overview adds reciter filters, top reciters and the recitation reports', () => {
    const profile = dashboardProfile('admin', 'recitation', null);
    expect(profile.recitation).toBeTrue();
    expect(profile.showReciterFilters).toBeTrue();
    expect(profile.splits).toContain('riwayah');
    expect(profile.panels.map((panel) => panel.by)).toEqual([
      'reciter',
      'surah',
      'asset',
      'country',
      'app',
      'platform',
    ]);
  });

  it('developers never get the recitation overview', () => {
    const profile = dashboardProfile('developer', 'recitation', null);
    expect(profile.recitation).toBeFalse();
    expect(profile.defaultMetric).toBe('api_calls');
  });

  it('text assets lead with downloads, installs, versions and languages', () => {
    const profile = dashboardProfile('admin', 'tafsir', 7);
    expect(profile.defaultMetric).toBe('downloads');
    expect(profile.headline).toContain('latest_version_share');
    expect(profile.panels.map((panel) => panel.by)).toEqual([
      'version',
      'language',
      'channel',
      'country',
    ]);
  });

  it('other assets show platforms instead of languages', () => {
    const profile = dashboardProfile('publisher', 'mushaf', 7);
    expect(profile.panels.map((panel) => panel.by)).toEqual([
      'version',
      'channel',
      'platform',
      'country',
    ]);
  });

  it('developers see their apps and endpoints, without export or category filters', () => {
    const profile = dashboardProfile('developer', null, null);
    expect(profile.defaultMetric).toBe('api_calls');
    expect(profile.headline).toContain('unique_end_users');
    expect(profile.showAppFilter).toBeTrue();
    expect(profile.showExport).toBeFalse();
    expect(profile.panels.map((panel) => panel.by)).toEqual([
      'app',
      'endpoint',
      'asset',
      'country',
    ]);
  });
});

describe('itemLabel', () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key;

  it('labels the folded rest, empty keys and API labels', () => {
    expect(itemLabel('country', '__other__', null, t, 'en')).toBe('USAGE.OTHER');
    expect(itemLabel('app', '', null, t, 'en')).toBe('USAGE.NO_APP');
    expect(itemLabel('country', '', null, t, 'en')).toBe('USAGE.UNKNOWN');
    expect(itemLabel('asset', '7', 'Mushaf', t, 'en')).toBe('Mushaf');
  });

  it('names countries and languages with Intl and translates channels and surahs', () => {
    expect(itemLabel('country', 'SA', null, t, 'en')).toBe('Saudi Arabia');
    expect(itemLabel('country', 'XX', null, t, 'en')).toBe('USAGE.UNKNOWN');
    expect(itemLabel('language', 'ar', null, t, 'en')).toBe('Arabic');
    expect(itemLabel('channel', 'cli', null, t, 'en')).toBe('USAGE.CHANNELS.cli');
    expect(itemLabel('surah', '2', null, t, 'en')).toBe('2. Al-Baqarah');
    expect(itemLabel('surah', '18', null, t, 'ar')).toBe('18. الكهف');
  });
});
