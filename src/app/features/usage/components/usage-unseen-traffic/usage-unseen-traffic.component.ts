import { Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { EChartsCoreOption } from 'echarts/core';
import { Subscription } from 'rxjs';
import {
  ReconciliationNumbers,
  UsageFilters,
  UsageReconciliation,
  UsageSeriesGranularity,
} from '../../models/usage.models';
import { UsageApiService } from '../../services/usage-api.service';
import { bucketLabels, buildTrendOptions } from '../../utils/usage-chart-options';
import { formatCompact } from '../../utils/usage-filters.util';
import { UsageChartComponent } from '../usage-chart/usage-chart.component';
import { usageLang } from '../../utils/usage-lang';

const MEASURES: (keyof ReconciliationNumbers)[] = ['reads', 'edge_requests', 'unseen'];

/** Translation keys (under USAGE.UNSEEN.GUIDE) of the "How to read this tab" sections. */
const GUIDE = [
  { title: 'WHAT_TITLE', items: ['WHAT_READS', 'WHAT_EDGE', 'WHAT_UNSEEN'] },
  { title: 'WHY_TITLE', items: ['WHY_BODY'] },
  { title: 'HOW_TITLE', items: ['HOW_LOW', 'HOW_ASSET', 'HOW_ALL'] },
  { title: 'CAVEATS_TITLE', items: ['CAVEAT_SIGNED', 'CAVEAT_CACHE'] },
];

/** Itqan admin: R2 reads the edge never saw (local caches bypassed, direct bucket access). */
@Component({
  selector: 'app-usage-unseen-traffic',
  standalone: true,
  imports: [TranslateModule, UsageChartComponent],
  templateUrl: './usage-unseen-traffic.component.html',
  styleUrl: './usage-unseen-traffic.component.less',
})
export class UsageUnseenTrafficComponent implements OnChanges {
  readonly filters = input.required<UsageFilters>();
  readonly granularity = input<UsageSeriesGranularity>('day');

  private readonly api = inject(UsageApiService);
  private readonly translate = inject(TranslateService);
  private request?: Subscription;

  readonly measures = MEASURES;
  readonly guide = GUIDE;
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly data = signal<UsageReconciliation | null>(null);

  readonly lang = usageLang();

  /** How weeks and partial buckets are counted (a translation key, or none for days). */
  readonly hint = computed(() => {
    const granularity = this.data()?.granularity;
    return granularity === 'week'
      ? 'USAGE.GRANULARITY.WEEK_HINT'
      : granularity === 'month'
        ? 'USAGE.GRANULARITY.MONTH_HINT'
        : '';
  });

  readonly buckets = computed(() => {
    const data = this.data();
    const { start_date, end_date } = this.filters();
    return bucketLabels(
      (data?.days ?? []).map((day) => day.t),
      data?.granularity ?? 'day',
      {
        lang: this.lang(),
        partial: data?.partial_buckets,
        range: { start_date, end_date },
        texts: {
          weekOf: (date) => this.translate.instant('USAGE.GRANULARITY.WEEK_OF', { date }) as string,
          partialWeek: (from, to) =>
            this.translate.instant('USAGE.GRANULARITY.PARTIAL_WEEK', { from, to }) as string,
          partialMonth: (from, to) =>
            this.translate.instant('USAGE.GRANULARITY.PARTIAL_MONTH', { from, to }) as string,
        },
      }
    );
  });

  readonly chartOptions = computed<EChartsCoreOption | null>(() => {
    const days = this.data()?.days;
    if (!days) {
      return null;
    }
    return buildTrendOptions(
      MEASURES.map((measure) => ({
        key: measure,
        label: this.translate.instant(`USAGE.UNSEEN.${measure.toUpperCase()}`) as string,
        points: days.map((day) => ({ t: day.t, value: day[measure] })),
      })),
      {
        rtl: this.lang() === 'ar',
        lang: this.lang(),
        labels: { other: '', unknown: '', previous: '' },
        buckets: this.buckets(),
      }
    );
  });

  readonly chartRows = computed(() =>
    (this.data()?.days ?? []).map((day, index) => ({
      label: this.buckets().titles[index] ?? day.t,
      value: MEASURES.map((measure) => formatCompact(day[measure], this.lang())).join(' · '),
    }))
  );

  format(value: number): string {
    return formatCompact(value, this.lang());
  }

  ngOnChanges(): void {
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.reconciliation(this.filters(), 20, this.granularity()).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
