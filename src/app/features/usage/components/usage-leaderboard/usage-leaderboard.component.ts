import { Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { Subscription } from 'rxjs';
import { UsageBreakdown, UsageFilters, UsageMetric } from '../../models/usage.models';
import { UsageApiService } from '../../services/usage-api.service';
import { itemLabel } from '../../utils/usage-dashboard.profile';
import { USAGE_METRICS, formatChange, formatCompact } from '../../utils/usage-filters.util';

/** Itqan admin: top publishers or assets with their previous-period values. */
@Component({
  selector: 'app-usage-leaderboard',
  standalone: true,
  imports: [FormsModule, NzSegmentedModule, NzSelectModule, NzSkeletonModule, TranslateModule],
  templateUrl: './usage-leaderboard.component.html',
  styleUrl: './usage-leaderboard.component.less',
})
export class UsageLeaderboardComponent implements OnChanges {
  readonly filters = input.required<UsageFilters>();

  private readonly api = inject(UsageApiService);
  private readonly translate = inject(TranslateService);
  private request?: Subscription;

  readonly metrics = USAGE_METRICS;
  readonly metric = signal<UsageMetric>('plays');
  readonly by = signal<'publisher' | 'asset'>('publisher');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly data = signal<UsageBreakdown | null>(null);

  readonly byOptions = computed(() => [
    { label: this.translate.instant('USAGE.SPLIT_BY.publisher') as string, value: 'publisher' },
    { label: this.translate.instant('USAGE.SPLIT_BY.asset') as string, value: 'asset' },
  ]);

  readonly rows = computed(() => {
    const lang = this.translate.currentLang || 'ar';
    const t = (key: string, params?: Record<string, unknown>) =>
      this.translate.instant(key, params) as string;
    return (this.data()?.items ?? []).map((item, index) => {
      const value = typeof item.value === 'number' ? item.value : null;
      const change =
        value !== null && item.previous ? (value - item.previous) / item.previous : null;
      return {
        rank: index + 1,
        label: itemLabel(this.by(), item.key, item.label, t, lang),
        value: formatCompact(item.value, lang),
        previous: formatCompact(item.previous, lang),
        change: formatChange(change, lang),
      };
    });
  });

  ngOnChanges(): void {
    this.load();
  }

  setMetric(metric: UsageMetric): void {
    this.metric.set(metric);
    this.load();
  }

  setBy(by: 'publisher' | 'asset'): void {
    this.by.set(by);
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api
      .leaderboard(this.filters(), { metric: this.metric(), by: this.by(), limit: 50 })
      .subscribe({
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
