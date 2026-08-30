import { Component, input, output } from '@angular/core';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

@Component({
  selector: 'app-admin-table-pagination',
  standalone: true,
  imports: [NzPaginationModule],
  templateUrl: './admin-table-pagination.component.html',
  styleUrl: './admin-table-pagination.component.less',
})
export class AdminTablePaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly loading = input(false);
  readonly showSizeChanger = input(true);
  readonly pageSizeOptions = input<number[]>([10, 25, 50]);
  readonly showQuickJumper = input(true);
  readonly hideWhenEmpty = input(true);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
}
