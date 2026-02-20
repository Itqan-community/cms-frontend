import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ToastService } from '../../../../shared/services/toast.service';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { Reciter } from '../../models/reciter.model';
import { RecitersService } from '../../services/reciters.service';

@Component({
  selector: 'app-reciters-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, NzTableModule, NzTagModule],
  templateUrl: './reciters-list.component.html',
  styleUrls: ['./reciters-list.component.less'],
})
export class RecitersListComponent implements OnInit {
  private readonly recitersService = inject(RecitersService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  reciters = signal<Reciter[]>([]);
  loading = signal(true);
  total = signal(0);
  pageIndex = signal(1);
  pageSize = signal(10);
  sortField = signal('name_ar');
  sortOrder = signal<NzTableSortOrder>('ascend');

  ngOnInit(): void {
    this.loadReciters();
  }

  loadReciters(): void {
    this.loading.set(true);

    const ordering = this.sortOrder() === 'descend' ? `-${this.sortField()}` : this.sortField();

    this.recitersService.getReciters(ordering, this.pageIndex(), this.pageSize()).subscribe({
      next: (response) => {
        this.reciters.set(response.results);
        this.total.set(response.count);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.toast.error(
          getErrorMessage(error) || this.translate.instant('RECITERS.LIST.ERRORS.LOAD_FAILED')
        );
      },
    });
  }

  onSortChange(field: string, order: NzTableSortOrder): void {
    this.sortField.set(field);
    this.sortOrder.set(order || 'ascend');
    this.pageIndex.set(1);
    this.loadReciters();
  }

  onPageChange(page: number): void {
    this.pageIndex.set(page);
    this.loadReciters();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
    this.loadReciters();
  }
}
