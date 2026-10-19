import {
  formatChange,
  formatCompact,
  granularityFor,
  presetRange,
  usageStateFromParams,
  usageStateToParams,
} from './usage-filters.util';

describe('usage-filters.util', () => {
  const today = new Date(Date.UTC(2026, 9, 18, 15));

  it('presetRange covers the last N days including today', () => {
    expect(presetRange('7d', today)).toEqual({ start_date: '2026-10-12', end_date: '2026-10-18' });
    expect(presetRange('30d', today).start_date).toBe('2026-09-19');
    expect(presetRange('12m', today).start_date).toBe('2025-10-19');
  });

  it('usageStateFromParams defaults to the last 30 days and plays', () => {
    const state = usageStateFromParams({}, today);
    expect(state.preset).toBe('30d');
    expect(state.filters).toEqual({ start_date: '2026-09-19', end_date: '2026-10-18' });
    expect(state.metric).toBe('plays');
  });

  it('round-trips a custom range and filters through query params', () => {
    const params = {
      range: 'custom',
      start: '2026-01-01',
      end: '2026-01-31',
      category: 'tafsir',
      channel: 'cli',
      app: '4',
      metric: 'downloads',
      split: 'country',
    };
    const state = usageStateFromParams(params, today);
    expect(state.filters).toEqual({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      category: 'tafsir',
      channel: 'cli',
      app: 4,
    });
    expect(usageStateToParams(state)).toEqual(params);
  });

  it('usageStateFromParams ignores an invalid custom range and unknown metric', () => {
    const state = usageStateFromParams(
      { range: 'custom', start: 'x', end: '2026-01-31', metric: 'nope' },
      today
    );
    expect(state.preset).toBe('30d');
    expect(state.metric).toBe('plays');
  });

  it('formatCompact formats numbers per language and passes "<3" through', () => {
    expect(formatCompact(1234, 'en')).toBe('1.2K');
    expect(formatCompact('<3', 'en')).toBe('<3');
    expect(formatCompact(null, 'en')).toBe('—');
    expect(formatCompact(5, 'ar')).toBe(new Intl.NumberFormat('ar').format(5));
  });

  it('formatChange returns a signed percentage and direction', () => {
    expect(formatChange(0.125, 'en')).toEqual({ text: '+12.5%', direction: 'up' });
    expect(formatChange(-0.5, 'en')).toEqual({ text: '-50%', direction: 'down' });
    expect(formatChange(0, 'en')).toEqual({ text: '0%', direction: 'flat' });
    expect(formatChange(null, 'en')).toBeNull();
  });

  it('granularityFor picks hourly, daily, weekly or monthly buckets by range length', () => {
    expect(granularityFor('2026-10-18', '2026-10-18')).toBe('hour');
    expect(granularityFor('2026-09-19', '2026-10-18')).toBe('day');
    expect(granularityFor('2026-01-01', '2026-10-18')).toBe('week');
    expect(granularityFor('2024-01-01', '2026-10-18')).toBe('month');
  });
});
