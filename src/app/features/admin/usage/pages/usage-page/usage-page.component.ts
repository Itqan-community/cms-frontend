import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { TranslateModule } from '@ngx-translate/core';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { UsageService } from '../../services/usage.service';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import {
  MixpanelSegmentationResponse,
  PublisherFilterItem,
} from '../../models/usage.models';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function buildBarOption(
  response: MixpanelSegmentationResponse,
  limit = 10,
): EChartsOption {
  const ranked = Object.entries(response.data.values)
    .map(([name, dateMap]) => ({
      name,
      total: Object.values(dateMap).reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { containLabel: true, left: 8, right: 16, top: 8, bottom: 8 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: ranked.map((r) => r.name), inverse: true },
    series: [{ type: 'bar', data: ranked.map((r) => r.total), barMaxWidth: 32 }],
  };
}

@Component({
  selector: 'app-usage-page',
  standalone: true,
  imports: [
    FormsModule,
    NgxEchartsDirective,
    NzCardModule,
    NzDatePickerModule,
    NzGridModule,
    NzSelectModule,
    NzSpinModule,
    NzEmptyModule,
    NzAlertModule,
    TranslateModule,
  ],
  templateUrl: './usage-page.component.html',
  styleUrl: './usage-page.component.less',
})
export class UsagePageComponent implements OnInit {
  private readonly usageService = inject(UsageService);
  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly destroyRef = inject(DestroyRef);
  readonly adminAuth = inject(AdminAuthService);

  readonly isItqanAdmin = this.adminAuth.isItqanAdmin;

  readonly today = new Date();
  readonly thirtyDaysAgo = new Date(this.today.getTime() - 30 * 24 * 60 * 60 * 1000);

  dateRange = signal<[Date, Date]>([this.thirtyDaysAgo, this.today]);
  selectedPublisherId = signal<number | null>(null);
  loading = signal(false);
  hasError = signal(false);
  publishers = signal<PublisherFilterItem[]>([]);
  publishersLoading = signal(false);

  private readonly timeseriesData = signal<MixpanelSegmentationResponse | null>(null);
  private readonly topEndpointsData = signal<MixpanelSegmentationResponse | null>(null);
  private readonly topEntitiesData = signal<MixpanelSegmentationResponse | null>(null);

  readonly timeseriesOption = computed<EChartsOption | null>(() => {
    const data = this.timeseriesData();
    if (!data) return null;
    const dates = data.data.series;
    const values = data.data.values;
    const eventKey = Object.keys(values)[0] ?? 'public_api_request';
    const counts = dates.map((d) => values[eventKey]?.[d] ?? 0);
    return {
      tooltip: { trigger: 'axis' },
      grid: { containLabel: true, left: 8, right: 16, top: 8, bottom: 8 },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          type: 'line',
          data: counts,
          smooth: true,
          areaStyle: { opacity: 0.15 },
        },
      ],
    };
  });

  readonly topEndpointsOption = computed<EChartsOption | null>(() => {
    const data = this.topEndpointsData();
    if (!data) return null;
    return buildBarOption(data);
  });

  readonly topEntitiesOption = computed<EChartsOption | null>(() => {
    const data = this.topEntitiesData();
    if (!data) return null;
    return buildBarOption(data);
  });

  ngOnInit(): void {
    if (this.isItqanAdmin()) {
      this.loadPublishers();
    }
    this.loadCharts();
  }

  onDateChange(range: [Date, Date] | null): void {
    if (!range) return;
    this.dateRange.set(range);
    this.loadCharts();
  }

  onPublisherChange(id: number | null): void {
    this.selectedPublisherId.set(id ?? null);
    this.loadCharts();
  }

  onPublisherSearch(query: string): void {
    this.loadPublishers(query);
  }

  private loadPublishers(query = ''): void {
    this.publishersLoading.set(true);
    this.publishersFilterService
      .search(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.publishers.set(res.results);
          this.publishersLoading.set(false);
        },
        error: () => this.publishersLoading.set(false),
      });
  }

  private loadCharts(): void {
    const [start, end] = this.dateRange();
    const from = formatDate(start);
    const to = formatDate(end);
    const pubId = this.isItqanAdmin() ? this.selectedPublisherId() : null;

    this.loading.set(true);
    this.hasError.set(false);

    forkJoin({
      timeseries: this.usageService
        .getTimeseries(from, to, pubId)
        .pipe(catchError(() => of(null))),
      topEndpoints: this.usageService
        .getTopEndpoints(from, to, pubId)
        .pipe(catchError(() => of(null))),
      topEntities: this.usageService
        .getTopEntities(from, to, pubId)
        .pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ timeseries, topEndpoints, topEntities }) => {
          this.timeseriesData.set(timeseries);
          this.topEndpointsData.set(topEndpoints);
          this.topEntitiesData.set(topEntities);
          this.loading.set(false);
          if (!timeseries && !topEndpoints && !topEntities) {
            this.hasError.set(true);
          }
        },
        error: () => {
          this.loading.set(false);
          this.hasError.set(true);
        },
      });
  }
}
