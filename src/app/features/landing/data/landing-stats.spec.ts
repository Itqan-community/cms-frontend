import { LANDING_STATS, formatStatsDate } from './landing-stats';

describe('landing stats', () => {
  it('has every count baked in', () => {
    for (const key of ['assets', 'publishers', 'recitations', 'reciters', 'packages'] as const) {
      expect(LANDING_STATS[key]).toBeGreaterThan(0);
    }
    expect(LANDING_STATS.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats the date in each language with Latin digits', () => {
    expect(formatStatsDate('2026-11-25', 'en')).toBe('25 November 2026');
    expect(formatStatsDate('2026-11-25', 'ar')).toBe('25 نوفمبر 2026');
  });
});
