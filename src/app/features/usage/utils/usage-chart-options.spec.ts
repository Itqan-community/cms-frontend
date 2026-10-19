import { UsageSeries } from '../models/usage.models';
import {
  buildBarOptions,
  buildDonutOptions,
  buildHourOfWeekOptions,
  buildTrendOptions,
  chartValue,
} from './usage-chart-options';

interface Axis {
  inverse?: boolean;
  position?: string;
  data?: string[];
}
interface Series {
  name: string;
  data: unknown[];
  type: string;
}
interface Built {
  xAxis: Axis;
  yAxis: Axis;
  series: Series[];
  legend?: { right?: string | number; left?: string | number };
  visualMap?: { max: number };
}

const asBuilt = (value: unknown): Built => value as Built;

describe('usage-chart-options', () => {
  const series: UsageSeries[] = [
    {
      key: 'SA',
      label: null,
      points: [
        { t: '2026-10-01', value: 3 },
        { t: '2026-10-02', value: 0 },
      ],
    },
    {
      key: '__other__',
      label: null,
      points: [
        { t: '2026-10-01', value: 1 },
        { t: '2026-10-02', value: null },
      ],
    },
  ];
  const labels = { other: 'Other', unknown: 'Unknown', previous: 'Previous period' };

  it('buildTrendOptions maps each series and labels the folded rest', () => {
    const options = asBuilt(buildTrendOptions(series, { rtl: false, labels }));

    expect(options.series.map((s) => s.name)).toEqual(['SA', 'Other']);
    expect(options.series[0].data).toEqual([3, 0]);
    expect(options.series[1].data).toEqual([1, null]);
    expect(options.xAxis.data).toEqual(['2026-10-01', '2026-10-02']);
    expect(options.xAxis.inverse).toBeFalse();
    expect(options.yAxis.position).toBe('left');
  });

  it('buildTrendOptions mirrors the axes in RTL and adds the previous period', () => {
    const options = asBuilt(
      buildTrendOptions(series.slice(0, 1), {
        rtl: true,
        labels,
        previous: [
          { t: '2026-09-29', value: 2 },
          { t: '2026-09-30', value: 4 },
        ],
      })
    );

    expect(options.xAxis.inverse).toBeTrue();
    expect(options.yAxis.position).toBe('right');
    expect(options.legend?.right).toBeDefined();
    expect(options.series.map((s) => s.name)).toEqual(['SA', 'Previous period']);
    expect(options.series[1].data).toEqual([2, 4]);
  });

  it('buildTrendOptions uses the label when present and Unknown for empty keys', () => {
    const options = asBuilt(
      buildTrendOptions(
        [
          { key: '7', label: 'Mushaf', points: [] },
          { key: '', label: null, points: [] },
        ],
        { rtl: false, labels }
      )
    );
    expect(options.series.map((s) => s.name)).toEqual(['Mushaf', 'Unknown']);
  });

  it('buildDonutOptions keeps numeric items and skips privacy-floor rows', () => {
    const options = asBuilt(
      buildDonutOptions(
        [
          { name: 'web', value: 5 },
          { name: 'cli', value: '<3' },
        ],
        { rtl: false }
      )
    );
    expect(options.series[0].type).toBe('pie');
    expect(options.series[0].data).toEqual([{ name: 'web', value: 5 }]);
  });

  it('buildBarOptions renders "<3" as zero with its label and mirrors in RTL', () => {
    const options = asBuilt(
      buildBarOptions(
        [
          { name: 'SA', value: 9 },
          { name: 'EG', value: '<3' },
        ],
        { rtl: true }
      )
    );
    expect(options.series[0].data).toEqual([
      { value: 9, label: { show: false } },
      { value: 0, label: { show: true, formatter: '<3' } },
    ]);
    expect(options.yAxis.data).toEqual(['SA', 'EG']);
    expect(options.xAxis.inverse).toBeTrue();
    expect(options.yAxis.position).toBe('right');
  });

  it('buildHourOfWeekOptions fills all 168 cells', () => {
    const options = asBuilt(
      buildHourOfWeekOptions(
        [
          { key: '1-0', label: null, value: 4, previous: null },
          { key: '7-23', label: null, value: 9, previous: null },
        ],
        { rtl: false, dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
      )
    );
    const data = options.series[0].data as [number, number, number][];
    expect(data.length).toBe(168);
    expect(data).toContain([0, 0, 4]);
    expect(data).toContain([23, 6, 9]);
    expect(options.visualMap?.max).toBe(9);
  });

  it('chartValue turns privacy-floor strings into 0', () => {
    expect(chartValue('<3')).toBe(0);
    expect(chartValue(4)).toBe(4);
  });
});
