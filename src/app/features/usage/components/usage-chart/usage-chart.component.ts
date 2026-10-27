import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

export interface UsageTableRow {
  label: string;
  value: string;
}

/**
 * A titled chart card with loading, empty and error states and a "view as table" toggle.
 * ECharts itself is loaded lazily the first time a chart renders.
 */
@Component({
  selector: 'app-usage-chart',
  standalone: true,
  imports: [NgxEchartsDirective, NzButtonModule, NzEmptyModule, NzSkeletonModule, TranslateModule],
  providers: [
    provideEchartsCore({ echarts: () => import('../../usage-echarts').then((m) => m.default) }),
  ],
  templateUrl: './usage-chart.component.html',
  styleUrl: './usage-chart.component.less',
})
export class UsageChartComponent {
  readonly title = input<string>('');
  /** Optional explanation under the title. */
  readonly hint = input<string>('');
  readonly options = input<EChartsCoreOption | null>(null);
  readonly rows = input<UsageTableRow[]>([]);
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly height = input(280);
  readonly retry = output<void>();

  readonly showTable = signal(false);

  private resizeObserver?: ResizeObserver;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.resizeObserver?.disconnect());
  }

  /**
   * A chart drawn while its card is hidden (an inactive tab) is laid out at ECharts' fallback
   * width and ngx-echarts does not resize it once the card shows, so watch the element here.
   */
  onChartInit(chart: ECharts): void {
    this.resizeObserver?.disconnect();
    const dom = chart.getDom();
    this.resizeObserver = new ResizeObserver(() => {
      if (!chart.isDisposed() && dom.clientWidth > 0 && dom.clientWidth !== chart.getWidth()) {
        chart.resize();
      }
    });
    this.resizeObserver.observe(dom);
  }

  toggleTable(): void {
    this.showTable.update((value) => !value);
  }
}
