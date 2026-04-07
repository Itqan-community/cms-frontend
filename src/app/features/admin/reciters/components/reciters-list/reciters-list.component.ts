import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import {
  ReciterListFilters,
  ReciterListItem,
  ReciterSorting,
} from '../../models/reciters.models';
import { RecitersAdminService } from '../../services/reciters.service';
import { ReciterFiltersComponent } from '../reciter-filters/reciter-filters.component';

@Component({
  selector: 'app-reciters-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzModalModule,
    NzButtonModule,
    NzPaginationModule,
    NzSpinModule,
    NzTableModule,
    NzToolTipModule,
    ReciterFiltersComponent,
  ],
  templateUrl: './reciters-list.component.html',
  styleUrl: './reciters-list.component.less',
})
export class RecitersListComponent implements OnInit {
  private readonly recitersService = inject(RecitersAdminService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);

  readonly reciters = signal<ReciterListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  private activeFilters: Partial<ReciterListFilters> = {};
  private ordering: ReciterSorting | undefined;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.recitersService
      .getList({
        page: this.page(),
        page_size: this.pageSize(),
        ...this.activeFilters,
        ordering: this.ordering,
      })
      .subscribe({
        next: (res) => {
          this.reciters.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.message.error('تعذر تحميل القرّاء. يرجى المحاولة لاحقاً.');
          this.loading.set(false);
        },
      });
  }

  onFiltersChange(filters: Partial<ReciterListFilters>): void {
    this.activeFilters = filters;
    this.page.set(1);
    this.load();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  onSortChange(
    column: 'name' | 'recitations_count' | 'created_at' | 'updated_at',
    order: NzTableSortOrder
  ): void {
    if (!order) {
      this.ordering = undefined;
    } else {
      const prefix = order === 'descend' ? '-' : '';
      this.ordering = `${prefix}${column}` as ReciterSorting;
    }
    this.page.set(1);
    this.load();
  }

  onView(id: number): void {
    void this.router.navigate(['/admin/reciters', id]);
  }

  onEdit(id: number): void {
    void this.router.navigate(['/admin/reciters', id, 'edit']);
  }

  onDelete(item: ReciterListItem): void {
    this.modal.confirm({
      nzTitle: 'هل أنت متأكد من حذف هذا القارئ؟',
      nzContent: `<b>${item.name}</b> — هذا الإجراء لا يمكن التراجع عنه.`,
      nzOkText: 'نعم، احذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        this.recitersService.delete(item.id).subscribe({
          next: () => {
            this.message.success('تم حذف القارئ بنجاح');
            this.load();
          },
          error: () => this.message.error('حدث خطأ أثناء الحذف'),
        }),
    });
  }

  truncate(text: string, max = 80): string {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }
}
