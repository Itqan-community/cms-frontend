import {
  Component,
  DestroyRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  input,
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
  UsageDimension,
  UsageFilters,
  UsageMetric,
  UsagePreset,
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
} from '../../utils/usage-chart-options';
import {
  UsageHeadline,
  UsagePanel,
  dashboardProfile,
  itemLabel,
} from '../../utils/usage-dashboard.profile';
import {
  UsageViewState,
  formatChange,
  formatCompact,
  granularityFor,
  presetRange,
  toIsoDay,
  usageStateFromParams,
  usageStateToParams,
} from '../../utils/usage-filters.util';
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
  'metric',
  'split',
];
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
    UsageChartComponent,
  ],
  templateUrl: './usage-dashboard.component.html',
  styleUrl: './usage-dashboard.component.less',
})
export class UsageDashboardComponent implements OnInit, OnChanges {
  readonly scope = input.required<UsageScope>();
  readonly assetId = input<number | null>(null);
  readonly category = input<string | null>(null);
  /** Admin scope only: limit the reports to one publisher. */
  readonly publisherId = input<number | null>(null);
  /** Keep filters in the URL (page dashboards) or locally (embedded sections). */
  readonly syncUrl = input(true);

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
  readonly profile = computed(() =>
    dashboardProfile(this.scope(), this.category(), this.assetId())
  );
  readonly presetOptions = computed(() => {
    this.lang();
    return PRESETS.map((preset) => ({ label: this.t(`USAGE.PRESETS.${preset}`), value: preset }));
  });
  readonly state = signal<UsageViewState>(usageStateFromParams({}));
  readonly summary = signal<Loadable<UsageSummary>>(idle());
  readonly trend = signal<Loadable<UsageTimeseries>>(idle());
  readonly panelStates = signal<Record<string, Loadable<UsageBreakdown>>>({});

  readonly filters = computed<UsageFilters>(() => ({
    ...this.state().filters,
    asset_id: this.assetId(),
    publisher_id: this.scope() === 'admin' ? this.publisherId() : null,
  }));
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
        value: formatCompact(metric?.value ?? null, lang),
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
    return buildTrendOptions(
      data.series.map((series) => ({
        ...series,
        label:
          series.key === 'all'
            ? this.t(`USAGE.METRICS.${data.metric}`)
            : itemLabel(split, series.key, series.label, this.t, this.lang()),
      })),
      {
        rtl: this.rtl(),
        labels: {
          other: this.t('USAGE.OTHER'),
          unknown: this.t('USAGE.UNKNOWN'),
          previous: this.t('USAGE.PREVIOUS_PERIOD'),
        },
        previous: data.previous,
      }
    );
  });

  readonly trendRows = computed<UsageTableRow[]>(() => {
    const series = this.trend().data?.series ?? [];
    return (series[0]?.points ?? []).map((point, index) => ({
      label: point.t,
      value: series
        .map((item) => formatCompact(item.points[index]?.value ?? null, this.lang()))
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
      const items = (state.data?.items ?? []).map((item) => ({
        name: itemLabel(panel.by, item.key, item.label, this.t, this.lang()),
        value: item.value,
      }));
      let options: EChartsCoreOption | null = null;
      if (state.data) {
        options =
          panel.chart === 'donut'
            ? buildDonutOptions(items, { rtl: this.rtl() })
            : panel.chart === 'heatmap'
              ? buildHourOfWeekOptions(state.data.items, {
                  rtl: this.rtl(),
                            dayLabels: DAY_KEYS.map((day) => this.t(`USAGE.DAYS.${day}`)),
                })
              : buildBarOptions(items, { rtl: this.rtl() });
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
      this.state.set({ ...usageStateFromParams({}), metric: this.profile().defaultMetric });
      this.load();
    }
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.initialized && (changes['publisherId'] || changes['assetId'])) {
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
    name: 'category' | 'channel' | 'platform' | 'app',
    value: string | number | null
  ): void {
    this.update({ filters: { ...this.state().filters, [name]: value || null } });
  }

  setMetric(metric: UsageMetric): void {
    this.update({ metric });
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
    const { metric, split } = this.state();
    this.track('summary', this.api.summary(scope, filters), (value) => this.summary.set(value));
    this.track(
      'trend',
      this.api.timeseries(scope, filters, {
        metric,
        granularity: this.granularity(),
        split_by: split as UsageDimension | null,
        top: 8,
        compare: !split,
      }),
      (value) => this.trend.set(value)
    );
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
