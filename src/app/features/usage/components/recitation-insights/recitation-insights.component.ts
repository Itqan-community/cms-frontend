import {
  Component,
  DestroyRef,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { EChartsCoreOption } from 'echarts/core';
import { Observable, Subscription } from 'rxjs';
import {
  RecitationCoverageItem,
  UsageCohorts,
  UsageFilters,
  UsageFirstSeen,
  UsageListeners,
  UsageScope,
  UsageSummary,
} from '../../models/usage.models';
import { surahLabel } from '../../../admin/models/quran-metadata';
import { UsageApiService } from '../../services/usage-api.service';
import { buildListenersOptions, formatPeriod } from '../../utils/usage-chart-options';
import { itemLabel } from '../../utils/usage-dashboard.profile';
import { formatCompact, granularityFor } from '../../utils/usage-filters.util';
import { usageLang } from '../../utils/usage-lang';
import { UsageChartComponent, UsageTableRow } from '../usage-chart/usage-chart.component';

interface Loadable<T> {
  loading: boolean;
  error: boolean;
  data: T | null;
}

const idle = <T>(): Loadable<T> => ({ loading: true, error: false, data: null });
const DAY_MS = 86_400_000;
/** The backend serves cohorts for ranges up to 26 weeks. */
const MAX_COHORT_DAYS = 26 * 7;
const FUNNEL_STEPS = ['views', 'downloads', 'plays'] as const;

/**
 * Recitation reports under a usage dashboard: listener growth, weekly cohorts, the countries and
 * apps the content reached, the gallery funnel and (on an asset page) its surah coverage.
 */
@Component({
  selector: 'app-recitation-insights',
  standalone: true,
  imports: [TranslateModule, UsageChartComponent],
  templateUrl: './recitation-insights.component.html',
  styleUrl: './recitation-insights.component.less',
})
export class RecitationInsightsComponent implements OnChanges {
  readonly scope = input.required<Exclude<UsageScope, 'developer'>>();
  readonly filters = input.required<UsageFilters>();
  readonly summary = input<UsageSummary | null>(null);
  readonly hijri = input(false);

  private readonly api = inject(UsageApiService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly running = new Map<string, Subscription>();
  readonly lang = usageLang();

  readonly listeners = signal<Loadable<UsageListeners>>(idle());
  readonly cohorts = signal<Loadable<UsageCohorts>>(idle());
  readonly countries = signal<Loadable<UsageFirstSeen>>(idle());
  readonly apps = signal<Loadable<UsageFirstSeen>>(idle());
  readonly coverage = signal<RecitationCoverageItem | null>(null);

  readonly t = (key: string, params?: Record<string, unknown>): string =>
    this.translate.instant(key, params) as string;

  readonly granularity = computed(() => {
    const { start_date, end_date } = this.filters();
    const granularity = granularityFor(start_date, end_date);
    return granularity === 'hour' ? 'day' : granularity;
  });

  readonly cohortsAllowed = computed(() => {
    const { start_date, end_date } = this.filters();
    return (Date.parse(end_date) - Date.parse(start_date)) / DAY_MS + 1 <= MAX_COHORT_DAYS;
  });

  readonly clampedStart = computed(() => {
    const value = this.listeners().data?.clamped_start;
    return value ? formatPeriod(value, this.lang(), this.hijri()) : null;
  });

  readonly listenersOptions = computed<EChartsCoreOption | null>(() => {
    const data = this.listeners().data;
    if (!data) {
      return null;
    }
    return buildListenersOptions(data.points, {
      rtl: this.lang() === 'ar',
      lang: this.lang(),
      hijri: this.hijri(),
      labels: {
        new: this.t('USAGE.RECITATION.NEW'),
        returning: this.t('USAGE.RECITATION.RETURNING'),
        cumulative: this.t('USAGE.RECITATION.CUMULATIVE'),
      },
      activeLabel: (counts) => this.t('USAGE.RECITATION.ACTIVE', counts),
    });
  });

  readonly listenersRows = computed<UsageTableRow[]>(() =>
    (this.listeners().data?.points ?? []).map((point) => ({
      label: formatPeriod(point.t, this.lang(), this.hijri()),
      value: [point.new, point.returning, point.cumulative]
        .map((value) => formatCompact(value, this.lang()))
        .join(' · '),
    }))
  );

  readonly listenersEmpty = computed(() =>
    (this.listeners().data?.points ?? []).every((point) => !point.new && !point.returning)
  );

  readonly cohortRows = computed(() => {
    const percent = new Intl.NumberFormat(this.lang() === 'ar' ? 'ar' : 'en', {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    return (this.cohorts().data?.cohorts ?? []).map((cohort) => ({
      week: formatPeriod(cohort.week, this.lang(), this.hijri()),
      size: formatCompact(cohort.size, this.lang()),
      cells: cohort.retention.map((share) => ({ share, text: percent.format(share) })),
    }));
  });

  readonly cohortWeeks = computed(() =>
    Array.from(
      { length: Math.max(0, ...this.cohortRows().map((row) => row.cells.length)) },
      (_, index) => index
    )
  );

  /** First-seen lists: the countries and the apps the content reached. */
  readonly spread = computed(() => [
    {
      title: 'USAGE.RECITATION.SPREAD_COUNTRIES',
      state: this.countries(),
      rows: this.firstSeenRows(this.countries().data),
    },
    {
      title: 'USAGE.RECITATION.SPREAD_APPS',
      state: this.apps(),
      rows: this.firstSeenRows(this.apps().data),
    },
  ]);

  /** Views → downloads → plays, each as a share of the largest step. */
  readonly funnel = computed(() => {
    const metrics = this.summary()?.metrics;
    if (!metrics) {
      return [];
    }
    const values = FUNNEL_STEPS.map((step) => metrics[step]?.value ?? 0);
    const max = Math.max(1, ...values);
    return FUNNEL_STEPS.map((step, index) => ({
      step,
      value: formatCompact(values[index], this.lang()),
      width: Math.round((values[index] / max) * 100),
    }));
  });

  readonly coverageText = computed(() => {
    const item = this.coverage();
    if (!item) {
      return null;
    }
    const percent = new Intl.NumberFormat(this.lang() === 'ar' ? 'ar' : 'en', {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    return {
      surahs: this.t('USAGE.RECITATION.COVERAGE', { surahs: item.surahs }),
      timed:
        item.timed_share === null
          ? null
          : this.t('USAGE.RECITATION.TIMED', { share: percent.format(item.timed_share) }),
      missing: item.missing_by_demand.length
        ? this.t('USAGE.RECITATION.MISSING_TOP', {
            surahs: item.missing_by_demand
              .slice(0, 5)
              .map((surah) => surahLabel(surah, this.lang() === 'ar'))
              .join(this.lang() === 'ar' ? '، ' : ', '),
          })
        : null,
      complete: item.surahs >= 114,
    };
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] || changes['scope']) {
      this.load();
    }
  }

  load(): void {
    const scope = this.scope();
    const filters = this.filters();
    this.track('listeners', this.api.listeners(scope, filters, this.granularity()), (value) =>
      this.listeners.set(value)
    );
    if (this.cohortsAllowed()) {
      this.track('cohorts', this.api.cohorts(scope, filters), (value) => this.cohorts.set(value));
    } else {
      this.running.get('cohorts')?.unsubscribe();
      this.cohorts.set({ loading: false, error: false, data: null });
    }
    this.track('countries', this.api.firstSeen(scope, filters, 'country'), (value) =>
      this.countries.set(value)
    );
    this.track('apps', this.api.firstSeen(scope, filters, 'app'), (value) => this.apps.set(value));
    if (filters.asset_id) {
      this.running.get('coverage')?.unsubscribe();
      this.running.set(
        'coverage',
        this.api
          .recitationCoverage(scope, {
            asset_id: filters.asset_id,
            incomplete_only: false,
            limit: 1,
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (data) => this.coverage.set(data.items[0] ?? null),
            error: () => this.coverage.set(null),
          })
      );
    }
  }

  private firstSeenRows(data: UsageFirstSeen | null) {
    const date = (value: string) => formatPeriod(value, this.lang(), this.hijri());
    return (data?.items ?? []).map((item) => ({
      key: item.key,
      label: itemLabel(data!.by, item.key, item.label, this.t, this.lang()),
      firstSeen: date(item.first_seen),
      plays: formatCompact(item.plays, this.lang()),
      isNew: item.new === true,
    }));
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
}
