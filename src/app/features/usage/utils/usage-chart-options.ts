import type { EChartsCoreOption } from 'echarts/core';
import {
  USAGE_OTHER_KEY,
  UsageBreakdownItem,
  UsagePoint,
  UsageSeries,
} from '../models/usage.models';

/**
 * Pure ECharts option builders for the usage dashboards. RTL mirrors the charts: the time or
 * value axis runs right to left, the category axis sits on the right and legends align right.
 */

export interface ChartItem {
  name: string;
  /** `"<3"` where the developer privacy floor hides a small number. */
  value: number | string;
}

const PALETTE = [
  '#527c66',
  '#22433d',
  '#a3c3b3',
  '#d4a03a',
  '#6c8ebf',
  '#b5654d',
  '#8f7bb5',
  '#4e6964',
  '#c2d7cc',
  '#7a8e8b',
];

/** Privacy-floor strings ("<3") plot as 0; their text is shown as a label instead. */
export function chartValue(value: number | string | null): number {
  return typeof value === 'number' ? value : 0;
}

function seriesName(
  series: Pick<UsageSeries, 'key' | 'label'>,
  labels: { other: string; unknown: string }
): string {
  if (series.key === USAGE_OTHER_KEY) {
    return labels.other;
  }
  return series.label || series.key || labels.unknown;
}

function locale(lang: string | undefined): string {
  return lang === 'ar' ? 'ar' : 'en';
}

function formatNumber(value: unknown, lang: string | undefined): string {
  return typeof value === 'number'
    ? new Intl.NumberFormat(locale(lang)).format(value)
    : String(value ?? '—');
}

/** A period key from the API (`2026-10`, `2026-10-01` or an ISO hour) as a localized label. */
export function formatPeriod(value: string, lang: string | undefined): string {
  const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale(lang), options).format(date);
  if (/^\d{4}-\d{2}$/.test(value)) {
    return format(new Date(`${value}-01T00:00:00Z`), {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return format(new Date(`${value}T00:00:00Z`), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : format(date, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function formatHour(hour: number, lang: string | undefined): string {
  return new Intl.DateTimeFormat(locale(lang), { hour: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, 0, 1, hour))
  );
}

/** Tooltip shared by every chart: localized numbers, right-to-left layout in Arabic. */
function tooltip(
  rtl: boolean,
  lang: string | undefined,
  extra: Record<string, unknown>
): Record<string, unknown> {
  return {
    confine: true,
    valueFormatter: (value: unknown) => formatNumber(value, lang),
    extraCssText: rtl ? 'direction: rtl; text-align: right;' : '',
    ...extra,
  };
}

function legend(rtl: boolean): Record<string, unknown> {
  return rtl ? { type: 'scroll', top: 0, right: 0 } : { type: 'scroll', top: 0, left: 0 };
}

export function buildTrendOptions(
  series: UsageSeries[],
  options: {
    rtl: boolean;
    lang?: string;
    labels: { other: string; unknown: string; previous: string };
    previous?: UsagePoint[] | null;
  }
): EChartsCoreOption {
  const { rtl, lang, labels, previous } = options;
  const times = series[0]?.points.map((point) => formatPeriod(point.t, lang)) ?? [];
  const lines: Record<string, unknown>[] = series.map((item) => ({
    name: seriesName(item, labels),
    type: 'line',
    smooth: true,
    showSymbol: times.length <= 31,
    data: item.points.map((point) => point.value),
  }));
  if (previous?.length) {
    lines.push({
      name: labels.previous,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { type: 'dashed', opacity: 0.6 },
      data: previous.map((point) => point.value),
    });
  }
  return {
    color: PALETTE,
    tooltip: tooltip(rtl, lang, { trigger: 'axis' }),
    legend: legend(rtl),
    grid: { top: 40, bottom: 30, left: 16, right: 16, containLabel: true },
    xAxis: { type: 'category', data: times, inverse: rtl, boundaryGap: false },
    yAxis: { type: 'value', position: rtl ? 'right' : 'left', minInterval: 1 },
    series: lines,
  };
}

export function buildDonutOptions(
  items: ChartItem[],
  options: { rtl: boolean; lang?: string }
): EChartsCoreOption {
  return {
    color: PALETTE,
    tooltip: tooltip(options.rtl, options.lang, { trigger: 'item' }),
    legend: { ...legend(options.rtl), orient: 'horizontal', bottom: 0, top: undefined },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: items
          .filter((item) => typeof item.value === 'number')
          .map((item) => ({ name: item.name, value: item.value })),
      },
    ],
  };
}

/** Horizontal ranked bars (countries, assets, apps). */
export function buildBarOptions(
  items: ChartItem[],
  options: { rtl: boolean; lang?: string }
): EChartsCoreOption {
  return {
    color: PALETTE,
    tooltip: tooltip(options.rtl, options.lang, {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    }),
    grid: { top: 8, bottom: 8, left: 8, right: 24, containLabel: true },
    xAxis: { type: 'value', inverse: options.rtl, minInterval: 1 },
    yAxis: {
      type: 'category',
      inverse: true,
      position: options.rtl ? 'right' : 'left',
      data: items.map((item) => item.name),
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 18,
        label: { position: options.rtl ? 'left' : 'right' },
        data: items.map((item) =>
          typeof item.value === 'number'
            ? { value: item.value, label: { show: false } }
            : { value: 0, label: { show: true, formatter: item.value } }
        ),
      },
    ],
  };
}

/** 7 × 24 heatmap; keys are `<ISO weekday>-<hour>` in the viewer's time zone. */
export function buildHourOfWeekOptions(
  items: UsageBreakdownItem[],
  options: { rtl: boolean; lang?: string; dayLabels: string[] }
): EChartsCoreOption {
  const values = new Map(items.map((item) => [item.key, chartValue(item.value)]));
  const data: [number, number, number][] = [];
  for (let day = 1; day <= 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      data.push([hour, day - 1, values.get(`${day}-${hour}`) ?? 0]);
    }
  }
  const max = Math.max(1, ...data.map((cell) => cell[2]));
  return {
    tooltip: tooltip(options.rtl, options.lang, {
      position: 'top',
      formatter: ({ value }: { value: [number, number, number] }) =>
        `${options.dayLabels[value[1]]} · ${formatHour(value[0], options.lang)} — ${formatNumber(value[2], options.lang)}`,
    }),
    grid: { top: 8, bottom: 60, left: 8, right: 8, containLabel: true },
    xAxis: {
      type: 'category',
      inverse: options.rtl,
      data: Array.from({ length: 24 }, (_, hour) => String(hour)),
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      position: options.rtl ? 'right' : 'left',
      data: options.dayLabels,
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#f0f5f2', '#527c66', '#22433d'] },
    },
    series: [{ type: 'heatmap', data, emphasis: { itemStyle: { borderColor: '#333' } } }],
  };
}
