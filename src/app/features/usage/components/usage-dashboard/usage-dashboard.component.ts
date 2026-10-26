import {
  Component,
  DestroyRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Observable, Subscription } from 'rxjs';
import {
  UsageBreakdown,
  UsageComparison,
  UsageDimension,
  UsageFilters,
  UsageMetric,
  UsagePoint,
  UsagePreset,
  UsageRange,
  UsageScope,
  UsageSummary,
  UsageTimeseries,
} from '../../models/usage.models';
import { UsageApiService } from '../../services/usage-api.service';
import {
  buildBarOptions,
  buildDonutOptions,
  buildHourOfWeekOptions,
  buildTrendOptions,
  formatPeriod,
} from '../../utils/usage-chart-options';
import {
  UsageHeadline,
  UsagePanel,
  dashboardProfile,
  itemLabel,
} from '../../utils/usage-dashboard.profile';
import {
  UsageViewState,
  comparisonRange,
  formatChange,
  formatCompact,
  granularityFor,
  presetRange,
  toIsoDay,
  usageStateFromParams,
  usageStateToParams,
} from '../../utils/usage-filters.util';
import { RecitationCatalogComponent } from '../recitation-catalog/recitation-catalog.component';
import { RecitationInsightsComponent } from '../recitation-insights/recitation-insights.component';
import { UsageChartComponent, UsageTableRow } from '../usage-chart/usage-chart.component';

interface Loadable<T> {
  loading: boolean;
  error: boolean;
  data: T | null;
}

interface PanelView {
  panel: UsagePanel;
  state: Loadable<UsageBreakdown>;
  options: EChartsCoreOption | null;
  rows: UsageTableRow[];
}

const URL_KEYS = [
  'range',
  'start',
  'end',
  'category',
  'channel',
  'platform',
  'country',
  'app',
  'reciter',
  'riwayah',
  'metric',
  'split',
  'compare',
];
const COMPARISONS: UsageComparison[] = ['previous', 'year', 'hijri_year'];
const PRESETS: UsagePreset[] = ['7d', '30d', '90d', '12m', 'custom'];
const CATEGORIES = [
  'recitation',
  'mushaf',
  'tafsir',
  'translation',
  'linguistic',
  'tajweed',
  'font',
  'search',
  'program',
];
const CHANNELS = ['gallery', 'cli', 'app_identified', 'web', 'app_unidentified', 'script', 'other'];
const PLATFORMS = ['android', 'ios', 'web', 'desktop', 'server', 'unknown'];
const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const idle = <T>(): Loadable<T> => ({ loading: true, error: false, data: null });

/** Listening time is reported in seconds and shown in hours. */
function displayValue(metric: UsageMetric, value: number | string | null): number | string | null {
  return metric === 'listening_seconds' && typeof value === 'number'
    ? Math.round(value / 360) / 10
    : value;
}

/**
 * One usage dashboard for every scope: filter bar, headline cards, trend chart, breakdown
 * panels and the disclaimer footer. Page-level dashboards keep their filters in the URL.
 */
@Component({
  selector: 'app-usage-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzSegmentedModule,
    NzSelectModule,
    NzToolTipModule,
    TranslateModule,
    RecitationCatalogComponent,
    RecitationInsightsComponent,
    UsageChartComponent,
  ],
  templateUrl: './usage-dashboard.component.html',
  styleUrl: './usage-dashboard.component.less',
})
export class UsageDashboardComponent implements OnInit, OnChanges {
  readonly scope = input.required<UsageScope>();
  readonly assetId = input<number | null>(null);
  /** The asset's category on asset pages; elsewhere it fixes the category filter (e.g. a tab). */
  readonly category = input<string | null>(null);
  /** Admin scope only: limit the reports to one publisher. */
  readonly publisherId = input<number | null>(null);
  /** Keep filters in the URL (page dashboards) or locally (embedded sections). */
  readonly syncUrl = input(true);
  /**
   * Local dashboards only: a date range owned by the page (e.g. shared between tabs). The
   * dashboard follows it and reports its own range changes through `rangeChange`.
   */
  readonly sharedRange = input<UsageRange | null>(null);
  readonly rangeChange = output<UsageRange>();

  private readonly api = inject(UsageApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly running = new Map<string, Subscription>();
  private initialized = false;

  readonly categories = CATEGORIES;
  readonly channels = CHANNELS;
  readonly platforms = PLATFORMS;

  readonly lang = signal(this.translate.currentLang || 'ar');
  readonly rtl = computed(() => this.lang() === 'ar');
  readonly state = signal<UsageViewState>(usageStateFromParams({}));
  /** The category the reports cover: fixed by the input, else picked in the filter bar. */
  readonly activeCategory = computed(() =>
    this.assetId() != null ? this.category() : (this.category() ?? this.state().filters.category)
  );
  readonly profile = computed(() =>
    dashboardProfile(this.scope(), this.activeCategory(), this.assetId())
  );
  readonly portalScope = computed(() => {
    const scope = this.scope();
    return scope === 'developer' ? null : scope;
  });
  /** Label the time axes in the Hijri calendar (buckets stay Gregorian). */
  readonly hijri = signal(false);
  readonly calendarOptions = computed(() => {
    this.lang();
    return [
      { label: this.t('USAGE.RECITATION.CALENDAR.gregorian'), value: 'gregorian' },
      { label: this.t('USAGE.RECITATION.CALENDAR.hijri'), value: 'hijri' },
    ];
  });
  readonly presetOptions = computed(() => {
    this.lang();
    return PRESETS.map((preset) => ({ label: this.t(`USAGE.PRESETS.${preset}`), value: preset }));
  });
  readonly summary = signal<Loadable<UsageSummary>>(idle());
  readonly trend = signal<Loadable<UsageTimeseries>>(idle());
  /** The same dates a (Gregorian or Hijri) year earlier, when the trend compares with them. */
  readonly yearTrend = signal<Loadable<UsageTimeseries>>(idle());
  readonly compareOptions = computed(() => {
    this.lang();
    return COMPARISONS.map((value) => ({ label: this.t(`USAGE.COMPARE.${value}`), value }));
  });
  readonly panelStates = signal<Record<string, Loadable<UsageBreakdown>>>({});

  // Compared by value: metric, split and comparison changes keep the same object, so the
  // recitation reports bound to it don't reload for them.
  readonly filters = computed<UsageFilters>(
    () => ({
      ...this.state().filters,
      category: this.assetId() != null ? null : this.activeCategory(),
      asset_id: this.assetId(),
      publisher_id: this.scope() === 'admin' ? this.publisherId() : null,
    }),
    {
      equal: (a, b) =>
        (Object.keys({ ...a, ...b }) as (keyof UsageFilters)[]).every((key) => a[key] === b[key]),
    }
  );
  readonly granularity = computed(() =>
    granularityFor(this.state().filters.start_date, this.state().filters.end_date)
  );
  readonly customRange = computed(() => [
    new Date(`${this.state().filters.start_date}T00:00:00`),
    new Date(`${this.state().filters.end_date}T00:00:00`),
  ]);

  readonly headlineCards = computed(() => {
    const summary = this.summary().data;
    const lang = this.lang();
    return this.profile().headline.map((key: UsageHeadline) => {
      if (key === 'latest_version_share') {
        const share = summary?.latest_version_share;
        return {
          key,
          value:
            share == null
              ? '—'
              : new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', {
                  style: 'percent',
                  maximumFractionDigits: 1,
                }).format(share),
          change: null,
          hint: '',
        };
      }
      const metric = key === 'integrating_apps' ? summary?.integrating_apps : summary?.metrics[key];
      return {
        key,
        value: formatCompact(
          key === 'integrating_apps'
            ? (metric?.value ?? null)
            : displayValue(key, metric?.value ?? null),
          lang
        ),
        change: formatChange(metric?.change, lang),
        hint: key === 'integrating_apps' ? '' : (summary?.definitions[key] ?? ''),
      };
    });
  });

  readonly trendOptions = computed<EChartsCoreOption | null>(() => {
    const data = this.trend().data;
    if (!data) {
      return null;
    }
    const split = this.state().split ?? '';
    const compare = this.state().compare;
    const compared =
      compare === 'previous' ? data.previous : (this.yearTrend().data?.series[0]?.points ?? null);
    const scale = (points: UsagePoint[]) =>
      points.map((point) => ({
        ...point,
        value: displayValue(data.metric, point.value) as number | null,
      }));
    return buildTrendOptions(
      data.series.map((series) => ({
        ...series,
        points: scale(series.points),
        label:
          series.key === 'all'
            ? this.t(`USAGE.METRICS.${data.metric}`)
            : itemLabel(split, series.key, series.label, this.t, this.lang()),
      })),
      {
        rtl: this.rtl(),
        lang: this.lang(),
        labels: {
          other: this.t('USAGE.OTHER'),
          unknown: this.t('USAGE.UNKNOWN'),
          previous: this.t(`USAGE.COMPARE.${compare}`),
          spike: this.t('USAGE.RECITATION.SPIKE'),
        },
        previous: compared && scale(compared),
        hijri: this.hijri(),
        spikes: !split,
      }
    );
  });

  readonly trendRows = computed<UsageTableRow[]>(() => {
    const data = this.trend().data;
    const series = data?.series ?? [];
    return (series[0]?.points ?? []).map((point, index) => ({
      label: formatPeriod(point.t, this.lang(), this.hijri()),
      value: series
        .map((item) =>
          formatCompact(displayValue(data!.metric, item.points[index]?.value ?? null), this.lang())
        )
        .join(' · '),
    }));
  });

  readonly trendEmpty = computed(() =>
    (this.trend().data?.series ?? []).every((series) =>
      series.points.every((point) => !point.value)
    )
  );

  readonly panels = computed<PanelView[]>(() =>
    this.profile().panels.map((panel) => {
      const state = this.panelStates()[panel.by] ?? idle<UsageBreakdown>();
      const metric = state.data?.metric ?? this.state().metric;
      const items = (state.data?.items ?? []).map((item) => ({
        name: itemLabel(panel.by, item.key, item.label, this.t, this.lang()),
        value: displayValue(metric, item.value) ?? 0,
      }));
      let options: EChartsCoreOption | null = null;
      if (state.data) {
        options =
          panel.chart === 'donut'
            ? buildDonutOptions(items, { rtl: this.rtl(), lang: this.lang() })
            : panel.chart === 'heatmap'
              ? buildHourOfWeekOptions(state.data.items, {
                  rtl: this.rtl(),
                  lang: this.lang(),
                  dayLabels: DAY_KEYS.map((day) => this.t(`USAGE.DAYS.${day}`)),
                })
              : buildBarOptions(items, { rtl: this.rtl(), lang: this.lang() });
      }
      return {
        panel,
        state,
        options,
        rows: items.map((item) => ({
          label: item.name,
          value: formatCompact(item.value, this.lang()),
        })),
      };
    })
  );

  /** Reciter and riwayah filters: those with plays in the range, fetched without that filter. */
  private readonly reciterChoices = signal<UsageBreakdown | null>(null);
  private readonly riwayahChoices = signal<UsageBreakdown | null>(null);
  readonly reciterOptions = computed(() => this.choiceOptions(this.reciterChoices()));
  readonly riwayahOptions = computed(() => this.choiceOptions(this.riwayahChoices()));

  /** Developer app filter: apps with traffic in the range, fetched without the app filter. */
  private readonly appChoices = signal<UsageBreakdown | null>(null);
  readonly appOptions = computed(() =>
    (this.appChoices()?.items ?? [])
      .filter((item) => item.key !== '')
      .map((item) => ({ id: Number(item.key), name: item.label ?? item.key }))
  );

  readonly updatedAt = computed(() => {
    const value = this.summary().data?.data_updated_at;
    if (!value) {
      return null;
    }
    return new Intl.DateTimeFormat(this.lang() === 'ar' ? 'ar' : 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  });

  readonly t = (key: string, params?: Record<string, unknown>): string =>
    this.translate.instant(key, params) as string;

  ngOnInit(): void {
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.lang.set(event.lang);
      this.load();
    });
    if (this.syncUrl()) {
      this.route.queryParamMap
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((params) => this.applyParams(params));
    } else {
      this.state.set(
        this.withRange(
          { ...usageStateFromParams({}), metric: this.profile().defaultMetric },
          this.sharedRange()
        )
      );
      this.load();
    }
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }
    const range = this.sharedRange();
    const rangeMoved = !!changes['sharedRange'] && !!range && !this.hasRange(range);
    if (rangeMoved) {
      this.state.set(this.withRange(this.state(), range));
    }
    if (rangeMoved || changes['publisherId'] || changes['assetId']) {
      this.load();
    }
  }

  setPreset(preset: UsagePreset): void {
    if (preset === 'custom') {
      this.update({ preset });
      return;
    }
    this.update({ preset, filters: { ...this.state().filters, ...presetRange(preset) } });
  }

  setCustomRange(range: Date[] | null): void {
    if (!range || range.length !== 2) {
      return;
    }
    this.update({
      preset: 'custom',
      filters: {
        ...this.state().filters,
        start_date: toIsoDay(this.localDay(range[0])),
        end_date: toIsoDay(this.localDay(range[1])),
      },
    });
  }

  setFilter(
    name: 'category' | 'channel' | 'platform' | 'app' | 'reciter_id' | 'riwayah_id',
    value: string | number | null
  ): void {
    const filters = { ...this.state().filters, [name]: value || null };
    if (name === 'category') {
      // Reciters and riwayat only filter recitations.
      filters.reciter_id = filters.riwayah_id = null;
    }
    this.update({ filters });
  }

  setMetric(metric: UsageMetric): void {
    this.update({ metric });
  }

  setCompare(compare: UsageComparison): void {
    this.update({ compare });
  }

  setSplit(split: UsageDimension | null): void {
    this.update({ split });
  }

  exportCsv(): void {
    const filters = this.filters();
    this.api.exportCsv(this.scope(), filters).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `usage-${filters.start_date}-${filters.end_date}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  load(): void {
    const scope = this.scope();
    const filters = this.filters();
    const { metric, split, compare } = this.state();
    this.track('summary', this.api.summary(scope, filters), (value) => this.summary.set(value));
    this.track(
      'trend',
      this.api.timeseries(scope, filters, {
        metric,
        granularity: this.granularity(),
        split_by: split as UsageDimension | null,
        top: 8,
        compare: !split && compare === 'previous',
      }),
      (value) => this.trend.set(value)
    );
    if (!split && compare !== 'previous') {
      this.track(
        'yearTrend',
        this.api.timeseries(
          scope,
          { ...filters, ...comparisonRange(filters, compare) },
          { metric, granularity: this.granularity() }
        ),
        (value) => this.yearTrend.set(value)
      );
    } else {
      this.running.get('yearTrend')?.unsubscribe();
      this.yearTrend.set({ loading: false, error: false, data: null });
    }
    if (this.profile().showAppFilter) {
      // Keep the previous choices until the new list arrives, so the select never empties.
      this.track(
        'apps',
        this.api.breakdown(scope, { ...filters, app: undefined }, { metric, by: 'app', limit: 50 }),
        (value) => {
          if (value.data) {
            this.appChoices.set(value.data);
          }
        }
      );
    }
    if (this.profile().showReciterFilters) {
      for (const [key, by, set] of [
        ['reciters', 'reciter', this.reciterChoices],
        ['riwayahs', 'riwayah', this.riwayahChoices],
      ] as const) {
        const unfiltered = { ...filters, [by === 'reciter' ? 'reciter_id' : 'riwayah_id']: null };
        this.track(
          key,
          this.api.breakdown(scope, unfiltered, { metric: 'plays', by, limit: 100 }),
          (value) => {
            if (value.data) {
              set.set(value.data);
            }
          }
        );
      }
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    for (const panel of this.profile().panels) {
      this.track(
        `panel:${panel.by}`,
        this.api.breakdown(scope, filters, {
          metric,
          by: panel.by,
          limit: panel.limit,
          tz: panel.by === 'hour_of_week' ? tz : undefined,
        }),
        (value) => this.panelStates.update((states) => ({ ...states, [panel.by]: value }))
      );
    }
  }

  /** Whether the current state already shows `range`. */
  private hasRange(range: UsageRange): boolean {
    const { preset, filters } = this.state();
    return (
      preset === range.preset &&
      filters.start_date === range.start_date &&
      filters.end_date === range.end_date
    );
  }

  private withRange(state: UsageViewState, range: UsageRange | null): UsageViewState {
    if (!range) {
      return state;
    }
    const { preset, start_date, end_date } = range;
    return { ...state, preset, filters: { ...state.filters, start_date, end_date } };
  }

  private choiceOptions(data: UsageBreakdown | null): { id: number; name: string }[] {
    return (data?.items ?? [])
      .filter((item) => item.key !== '')
      .map((item) => ({ id: Number(item.key), name: item.label ?? item.key }));
  }

  private applyParams(params: ParamMap): void {
    const raw: Record<string, string> = {};
    for (const key of params.keys) {
      raw[key] = params.get(key) ?? '';
    }
    const state = usageStateFromParams(raw);
    this.state.set(raw['metric'] ? state : { ...state, metric: this.profile().defaultMetric });
    this.load();
  }

  private update(patch: Partial<UsageViewState>): void {
    const next = { ...this.state(), ...patch };
    if (!this.syncUrl()) {
      this.state.set(next);
      this.load();
      if (this.sharedRange() && !this.hasRange(this.sharedRange()!)) {
        this.rangeChange.emit({
          preset: next.preset,
          start_date: next.filters.start_date,
          end_date: next.filters.end_date,
        });
      }
      return;
    }
    const queryParams: Record<string, string | null> = Object.fromEntries(
      URL_KEYS.map((key) => [key, null])
    );
    Object.assign(queryParams, usageStateToParams(next));
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private track<T>(key: string, source: Observable<T>, set: (value: Loadable<T>) => void): void {
    this.running.get(key)?.unsubscribe();
    set({ loading: true, error: false, data: null });
    this.running.set(
      key,
      source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (data) => set({ loading: false, error: false, data }),
        error: () => set({ loading: false, error: true, data: null }),
      })
    );
  }

  /** The date picker returns local midnight; keep the calendar day the user picked. */
  private localDay(value: Date): Date {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
}
