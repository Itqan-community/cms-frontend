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
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-resolver.util';
import {
  UsageAccessRequests,
  UsageCliVersions,
  UsageFilters,
  UsageScope,
  UsageSeriesGranularity,
} from '../../models/usage.models';
import { UsageApiService } from '../../services/usage-api.service';
import { bucketLabels, buildTrendOptions } from '../../utils/usage-chart-options';
import { itemLabel } from '../../utils/usage-dashboard.profile';
import { formatChange, formatCompact, granularityFor } from '../../utils/usage-filters.util';
import { usageLang } from '../../utils/usage-lang';
import { UsageChartComponent, UsageTableRow } from '../usage-chart/usage-chart.component';

interface Loadable<T> {
  loading: boolean;
  /** The backend's message (or the generic one when it gave none); null without an error. */
  error: string | null;
  data: T | null;
}

const idle = <T>(): Loadable<T> => ({ loading: true, error: null, data: null });
const STATUSES = ['pending', 'approved', 'rejected'] as const;

/**
 * Text-asset reports under a usage dashboard: CLI installs and updates per version and the
 * access requests made in the range (text assets have no plays).
 */
@Component({
  selector: 'app-text-insights',
  standalone: true,
  imports: [TranslateModule, UsageChartComponent],
  templateUrl: './text-insights.component.html',
  styleUrl: './text-insights.component.less',
})
export class TextInsightsComponent implements OnChanges {
  readonly scope = input.required<Exclude<UsageScope, 'developer'>>();
  readonly filters = input.required<UsageFilters>();
  /** The dashboard's bucket size; by default the one for the range length. */
  readonly granularity = input<UsageSeriesGranularity | null>(null);

  private readonly api = inject(UsageApiService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly running = new Map<string, Subscription>();
  readonly lang = usageLang();

  readonly versions = signal<Loadable<UsageCliVersions>>(idle());
  readonly requests = signal<Loadable<UsageAccessRequests>>(idle());

  readonly t = (key: string, params?: Record<string, unknown>): string =>
    this.translate.instant(key, params) as string;

  /** One asset's page: the asset column and the top-assets list say nothing new. */
  readonly singleAsset = computed(() => this.filters().asset_id != null);

  readonly bucketSize = computed<UsageSeriesGranularity>(() => {
    const picked = this.granularity();
    if (picked) {
      return picked;
    }
    const { start_date, end_date } = this.filters();
    const granularity = granularityFor(start_date, end_date);
    return granularity === 'hour' ? 'day' : granularity;
  });

  readonly versionRows = computed(() => {
    const lang = this.lang();
    return (this.versions().data?.items ?? []).map((item) => ({
      key: item.version_id,
      asset: item.asset ?? '—',
      version: item.version || this.t('USAGE.TEXT.UNNAMED_VERSION'),
      language: item.language ? itemLabel('language', item.language, null, this.t, lang) : '—',
      installs: formatCompact(item.installs, lang),
      updates: formatCompact(item.updates, lang),
    }));
  });

  readonly requestTotals = computed(() => {
    const data = this.requests().data;
    if (!data) {
      return null;
    }
    const lang = this.lang();
    return {
      value: formatCompact(data.total.value, lang),
      change: formatChange(data.total.change, lang),
      statuses: STATUSES.map((status) => ({
        status,
        text: this.t(`USAGE.TEXT.STATUS.${status}`, {
          count: formatCompact(data.statuses[status], lang),
        }),
      })),
    };
  });

  readonly requestBuckets = computed(() => {
    const data = this.requests().data;
    const { start_date, end_date } = this.filters();
    return bucketLabels(
      (data?.points ?? []).map((point) => point.t),
      data?.granularity ?? 'day',
      {
        lang: this.lang(),
        partial: data?.partial_buckets,
        range: { start_date, end_date },
        texts: {
          weekOf: (date) => this.t('USAGE.GRANULARITY.WEEK_OF', { date }),
          partialWeek: (from, to) => this.t('USAGE.GRANULARITY.PARTIAL_WEEK', { from, to }),
          partialMonth: (from, to) => this.t('USAGE.GRANULARITY.PARTIAL_MONTH', { from, to }),
        },
      }
    );
  });

  readonly requestOptions = computed<EChartsCoreOption | null>(() => {
    const data = this.requests().data;
    if (!data) {
      return null;
    }
    return buildTrendOptions(
      [{ key: 'all', label: this.t('USAGE.TEXT.REQUESTS_SERIES'), points: data.points }],
      {
        rtl: this.lang() === 'ar',
        lang: this.lang(),
        labels: {
          other: this.t('USAGE.OTHER'),
          unknown: this.t('USAGE.UNKNOWN'),
          previous: this.t('USAGE.COMPARE.previous'),
        },
        buckets: this.requestBuckets(),
      }
    );
  });

  readonly requestRows = computed<UsageTableRow[]>(() =>
    (this.requests().data?.points ?? []).map((point, index) => ({
      label: this.requestBuckets().titles[index] ?? point.t,
      value: formatCompact(point.value, this.lang()),
    }))
  );

  readonly requestsEmpty = computed(() =>
    (this.requests().data?.points ?? []).every((point) => !point.value)
  );

  readonly requestAssets = computed(() =>
    (this.requests().data?.assets ?? []).map((item) => ({
      key: item.key,
      label: item.label ?? item.key,
      value: formatCompact(item.value, this.lang()),
    }))
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] || changes['scope']) {
      this.load();
    } else if (changes['granularity']) {
      this.loadRequests();
    }
  }

  load(): void {
    this.track('versions', this.api.cliVersions(this.scope(), this.filters()), (value) =>
      this.versions.set(value)
    );
    this.loadRequests();
  }

  loadRequests(): void {
    this.track(
      'requests',
      this.api.accessRequests(this.scope(), this.filters(), this.bucketSize()),
      (value) => this.requests.set(value)
    );
  }

  private track<T>(key: string, source: Observable<T>, set: (value: Loadable<T>) => void): void {
    this.running.get(key)?.unsubscribe();
    set({ loading: true, error: null, data: null });
    this.running.set(
      key,
      source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (data) => set({ loading: false, error: null, data }),
        error: (error: unknown) =>
          set({
            loading: false,
            error: resolveApiErrorMessage(
              error,
              { fallbackKey: 'USAGE.LOAD_ERROR' },
              this.translate
            ),
            data: null,
          }),
      })
    );
  }
}
