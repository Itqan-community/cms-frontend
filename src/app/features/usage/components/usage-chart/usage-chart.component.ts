import { Component, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { EChartsCoreOption } from 'echarts/core';
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
  readonly options = input<EChartsCoreOption | null>(null);
  readonly rows = input<UsageTableRow[]>([]);
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly height = input(280);
  readonly retry = output<void>();

  readonly showTable = signal(false);

  toggleTable(): void {
    this.showTable.update((value) => !value);
  }
}
