import { Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { EChartsCoreOption } from 'echarts/core';
import { Subscription } from 'rxjs';
import {
  ReconciliationNumbers,
  UsageFilters,
  UsageReconciliation,
} from '../../models/usage.models';
import { UsageApiService } from '../../services/usage-api.service';
import { buildTrendOptions } from '../../utils/usage-chart-options';
import { formatCompact } from '../../utils/usage-filters.util';
import { UsageChartComponent } from '../usage-chart/usage-chart.component';
import { usageLang } from '../../utils/usage-lang';

const MEASURES: (keyof ReconciliationNumbers)[] = ['reads', 'edge_requests', 'unseen'];

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

  private readonly api = inject(UsageApiService);
  private readonly translate = inject(TranslateService);
  private request?: Subscription;

  readonly measures = MEASURES;
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly data = signal<UsageReconciliation | null>(null);

  readonly lang = usageLang();

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
        labels: { other: '', unknown: '', previous: '' },
      }
    );
  });

  readonly chartRows = computed(() =>
    (this.data()?.days ?? []).map((day) => ({
      label: day.t,
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
    this.request = this.api.reconciliation(this.filters()).subscribe({
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
