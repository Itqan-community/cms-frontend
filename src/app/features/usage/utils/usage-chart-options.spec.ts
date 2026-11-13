import { UsageSeries } from '../models/usage.models';
import {
  bucketLabels,
  buildBarOptions,
  buildDonutOptions,
  buildHourOfWeekOptions,
  buildListenersOptions,
  buildTrendOptions,
  chartValue,
  formatPeriod,
  spikeIndexes,
  timeLabelInterval,
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
    expect(options.xAxis.data).toEqual(['Oct 1, 2026', 'Oct 2, 2026']);
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
    expect(options.series.map((s) => s.name)).toEqual([
      'SA',
      'Previous period (Sep 29, 2026 – Sep 30, 2026)',
    ]);
    expect(options.series[1].data).toEqual([2, 4]);
  });

  it('buildTrendOptions shows each comparison point with its own date and escapes names', () => {
    const options = buildTrendOptions(
      [{ key: '1', label: '<b>A</b>', points: [{ t: '2026-10-01', value: 5 }] }],
      {
        rtl: false,
        lang: 'en',
        labels,
        previous: [
          { t: '2025-10-01', value: 3 },
          { t: '2025-10-02', value: 9 },
        ],
      }
    ) as {
      series: { data: unknown[] }[];
      tooltip: { formatter: (params: unknown[]) => string };
    };
    expect(options.series[1].data).toEqual([3]); // aligned to the current buckets

    const html = options.tooltip.formatter([
      {
        marker: '•',
        seriesName: '<b>A</b>',
        seriesIndex: 0,
        dataIndex: 0,
        value: 5,
        axisValueLabel: 'Oct 1',
      },
      {
        marker: '•',
        seriesName: 'x',
        seriesIndex: 1,
        dataIndex: 0,
        value: 3,
        axisValueLabel: 'Oct 1',
      },
    ]);
    expect(html).toContain('&lt;b&gt;A&lt;/b&gt;');
    expect(html).toContain('Previous period · Oct 1, 2025');
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

  it('buildHourOfWeekOptions starts the heatmap scale from a dark tint in dark mode', () => {
    const build = (dark: boolean) =>
      asBuilt(buildHourOfWeekOptions([], { rtl: false, dayLabels: [], dark })) as unknown as {
        visualMap: { inRange: { color: string[] } };
      };
    expect(build(false).visualMap.inRange.color).toEqual(['#f0f5f2', '#527c66', '#22433d']);
    expect(build(true).visualMap.inRange.color[0]).toBe('#17221d');
  });

  describe('localized tooltips', () => {
    interface Tooltip {
      valueFormatter: (value: unknown) => string;
      formatter?: (params: { value: [number, number, number] }) => string;
      extraCssText?: string;
    }
    const tooltipOf = (value: unknown) => (value as { tooltip: Tooltip }).tooltip;
    const day = (iso: string, lang: string) =>
      new Intl.DateTimeFormat(lang, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${iso}T00:00:00Z`));

    it('formats the trend dates and values in the active language and lays out RTL', () => {
      const built = buildTrendOptions(series.slice(0, 1), { rtl: true, lang: 'ar', labels });

      expect(asBuilt(built).xAxis.data).toEqual([day('2026-10-01', 'ar'), day('2026-10-02', 'ar')]);
      expect(tooltipOf(built).valueFormatter(12345)).toBe(
        new Intl.NumberFormat('ar').format(12345)
      );
      expect(tooltipOf(built).extraCssText).toContain('direction: rtl');
    });

    it('formats bar and donut values in the active language', () => {
      const items = [{ name: 'SA', value: 1500 }];

      for (const built of [
        buildBarOptions(items, { rtl: true, lang: 'ar' }),
        buildDonutOptions(items, { rtl: true, lang: 'ar' }),
      ]) {
        expect(tooltipOf(built).valueFormatter(1500)).toBe(
          new Intl.NumberFormat('ar').format(1500)
        );
      }
    });

    it('names the day and hour in the heatmap tooltip', () => {
      const built = buildHourOfWeekOptions([], {
        rtl: true,
        lang: 'ar',
        dayLabels: ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
      });

      const text = tooltipOf(built).formatter!({ value: [14, 4, 1200] });

      expect(text).toContain('الجمعة');
      expect(text).toContain(new Intl.NumberFormat('ar').format(1200));
      expect(text).not.toContain('[');
    });
  });

  describe('bucket labels', () => {
    const texts = {
      weekOf: (date: string) => `Week of ${date}`,
      partialWeek: (from: string, to: string) => `partial week: ${from} – ${to}`,
      partialMonth: (from: string, to: string) => `partial month: ${from} – ${to}`,
    };

    it('labels ISO weeks by their Monday and names the days a partial week covers', () => {
      const labels = bucketLabels(['2026-10-05', '2026-10-12'], 'week', {
        lang: 'en',
        partial: ['2026-10-05', '2026-10-12'],
        range: { start_date: '2026-10-10', end_date: '2026-10-16' },
        texts,
      });

      expect(labels.axis).toEqual(['Oct 5, 2026', 'Oct 12, 2026']);
      expect(labels.titles).toEqual([
        'Week of Oct 5, 2026 (partial week: Oct 10, 2026 – Oct 11, 2026)',
        'Week of Oct 12, 2026 (partial week: Oct 12, 2026 – Oct 16, 2026)',
      ]);
    });

    it('labels months by name and only flags the partial ones', () => {
      const labels = bucketLabels(['2026-08-01', '2026-09-01', '2026-10-01'], 'month', {
        lang: 'en',
        partial: ['2026-08-01'],
        range: { start_date: '2026-08-20', end_date: '2026-10-31' },
        texts,
      });

      expect(labels.axis).toEqual(['Aug 2026', 'Sep 2026', 'Oct 2026']);
      expect(labels.titles[0]).toBe('Aug 2026 (partial month: Aug 20, 2026 – Aug 31, 2026)');
      expect(labels.titles.slice(1)).toEqual(['Sep 2026', 'Oct 2026']);
    });

    it('labels Arabic weeks with Arabic dates', () => {
      const labels = bucketLabels(['2026-10-05'], 'week', {
        lang: 'ar',
        texts: { ...texts, weekOf: (date: string) => `أسبوع ${date}` },
      });

      expect(labels.titles[0]).toBe(`أسبوع ${formatPeriod('2026-10-05', 'ar')}`);
    });

    it('puts the bucket titles in the trend tooltip', () => {
      const buckets = { axis: ['Oct 5, 2026'], titles: ['Week of Oct 5, 2026'] };
      const options = buildTrendOptions(
        [{ key: 'all', label: 'Plays', points: [{ t: '2026-10-05', value: 3 }] }],
        { rtl: false, lang: 'en', labels: { other: '', unknown: '', previous: '' }, buckets }
      ) as { tooltip: { formatter: (params: unknown[]) => string }; xAxis: Axis };

      expect(options.xAxis.data).toEqual(['Oct 5, 2026']);
      const html = options.tooltip.formatter([
        {
          marker: '',
          seriesName: 'Plays',
          seriesIndex: 0,
          dataIndex: 0,
          value: 3,
          axisValueLabel: 'x',
        },
      ]);
      expect(html).toContain('Week of Oct 5, 2026');
    });
  });

  it('chartValue turns privacy-floor strings into 0', () => {
    expect(chartValue('<3')).toBe(0);
    expect(chartValue(4)).toBe(4);
  });

  describe('recitation reports', () => {
    it('spikeIndexes flags values at least 3x the median of the previous 7 points', () => {
      expect(spikeIndexes([2, 2, 2, 2, 2, 2, 2, 6, 5, 2])).toEqual([7]);
      expect(spikeIndexes([0, 0, 0, 0, 0, 0, 0, 9])).toEqual([]);
      expect(spikeIndexes([1, 1, 1])).toEqual([]);
    });

    it('spikeIndexes leaves missing buckets out of the baseline', () => {
      // Median of 10, 10, 100, 100 is 55: 150 is below 3x and must not be flagged.
      expect(spikeIndexes([null, null, null, 10, 10, 100, 100, 150])).toEqual([]);
      expect(spikeIndexes([null, null, null, null, null, null, null, 5])).toEqual([]);
    });

    it('buildTrendOptions marks spikes on an unsplit series only', () => {
      const points = [1, 1, 1, 1, 1, 1, 1, 10].map((value, day) => ({
        t: `2026-10-${String(day + 1).padStart(2, '0')}`,
        value,
      }));
      const labels = { other: 'Other', unknown: '?', previous: 'Prev', spike: 'Spike' };
      const single = buildTrendOptions([{ key: 'all', label: null, points }], {
        rtl: false,
        labels,
        spikes: true,
      }) as { series: { markPoint?: { data: { coord: number[] }[] } }[] };
      expect(single.series[0].markPoint?.data).toEqual([{ coord: [7, 10] }]);
      const split = buildTrendOptions(
        [
          { key: 'a', label: 'A', points },
          { key: 'b', label: 'B', points },
        ],
        { rtl: false, labels, spikes: true }
      ) as { series: { markPoint?: unknown }[] };
      expect(split.series[0].markPoint).toBeUndefined();
    });

    it('bar charts use compact value ticks', () => {
      const options = buildBarOptions([{ name: 'A', value: 8000 }], { rtl: false, lang: 'en' }) as {
        xAxis: { axisLabel: { formatter: (value: number) => string } };
      };
      expect(options.xAxis.axisLabel.formatter(8000)).toBe('8K');
    });

    it('date axes use an explicit label interval (auto collapses reversed RTL axes)', () => {
      expect(timeLabelInterval(7)).toBe(0);
      expect(timeLabelInterval(90)).toBe(11);
      const points = Array.from({ length: 90 }, (_, day) => ({ t: '2026-07-25', value: day }));
      const options = buildTrendOptions([{ key: 'all', label: null, points }], {
        rtl: true,
        labels: { other: 'o', unknown: 'u', previous: 'p' },
      }) as { xAxis: { axisLabel: { interval: number } } };
      expect(options.xAxis.axisLabel.interval).toBe(11);
    });

    it('formatPeriod labels a day in the Hijri calendar when asked', () => {
      expect(formatPeriod('2026-03-01', 'en', true)).toContain('1447');
      expect(formatPeriod('2026-03-01', 'en')).toContain('2026');
    });

    it('buildListenersOptions stacks new and returning listeners and adds the cumulative line', () => {
      const options = buildListenersOptions(
        [
          { t: '2026-10-12', new: 2, returning: 1, cumulative: 5 },
          { t: '2026-10-13', new: 1, returning: 3, cumulative: 6 },
        ],
        {
          rtl: true,
          lang: 'en',
          labels: { new: 'New', returning: 'Back', cumulative: 'All' },
          activeLabel: ({ total, new: fresh, returning }) =>
            `Active ${total} = ${fresh} + ${returning}`,
        }
      ) as {
        series: { name: string; stack?: string; yAxisIndex?: number; data: number[] }[];
        xAxis: { inverse: boolean };
        tooltip: { formatter: (params: unknown[]) => string };
      };
      expect(options.series.map((item) => item.name)).toEqual(['New', 'Back', 'All']);
      expect(options.series[0].stack).toBe('active');
      expect(options.series[1].data).toEqual([1, 3]);
      expect(options.series[2].yAxisIndex).toBe(1);
      expect(options.xAxis.inverse).toBeTrue();
      // The tooltip sums the bars and shows the running total separately.
      const html = options.tooltip.formatter([
        {
          marker: '',
          seriesName: 'New',
          seriesIndex: 0,
          dataIndex: 1,
          value: 1,
          axisValueLabel: 'Oct 13',
        },
        {
          marker: '•',
          seriesName: 'All',
          seriesIndex: 2,
          dataIndex: 1,
          value: 6,
          axisValueLabel: 'Oct 13',
        },
      ]);
      expect(html).toBe('Oct 13<br/>Active 4 = 1 + 3<br/>•All: <b>6</b>');
    });
  });
});
