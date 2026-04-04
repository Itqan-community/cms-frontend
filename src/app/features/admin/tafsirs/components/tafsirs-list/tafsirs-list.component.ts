import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import {
  AssetSortingQuery,
  TafsirFilters,
  TafsirItem,
} from '../../models/tafsirs.models';
import { TafsirsService } from '../../services/tafsirs.service';
import { TafsirFiltersComponent } from '../tafsir-filters/tafsir-filters.component';

@Component({
  selector: 'app-tafsirs-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzModalModule,
    NzButtonModule,
    NzPaginationModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    TafsirFiltersComponent,
  ],
  templateUrl: './tafsirs-list.component.html',
  styleUrl: './tafsirs-list.component.less',
})
export class TafsirsListComponent implements OnInit {
  private readonly tafsirsService = inject(TafsirsService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);

  readonly tafsirs = signal<TafsirItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  private activeFilters: Partial<TafsirFilters> = {};
  private ordering: AssetSortingQuery | undefined;

  readonly licensesColors = LicensesColors;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.tafsirsService
      .getList({
        page: this.page(),
        page_size: this.pageSize(),
        ...this.activeFilters,
        ordering: this.ordering,
      })
      .subscribe({
        next: (res) => {
          this.tafsirs.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.message.error('تعذر تحميل التفاسير. يرجى المحاولة لاحقاً.');
          this.loading.set(false);
        },
      });
  }

  onFiltersChange(filters: Partial<TafsirFilters>): void {
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

  onSortChange(column: 'name' | 'publisher_id', order: NzTableSortOrder): void {
    if (!order) {
      this.ordering = undefined;
    } else {
      const prefix = order === 'descend' ? '-' : '';
      this.ordering = `${prefix}${column}` as AssetSortingQuery;
    }
    this.page.set(1);
    this.load();
  }

  onView(id: number): void {
    void this.router.navigate(['/admin/tafsirs', id]);
  }

  onEdit(id: number): void {
    void this.router.navigate(['/admin/tafsirs', id, 'edit']);
  }

  onDelete(item: TafsirItem): void {
    this.modal.confirm({
      nzTitle: 'هل أنت متأكد من حذف هذا التفسير؟',
      nzContent: `<b>${item.name}</b> — هذا الإجراء لا يمكن التراجع عنه.`,
      nzOkText: 'نعم، احذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        this.tafsirsService.delete(item.id).subscribe({
          next: () => {
            this.message.success('تم حذف التفسير بنجاح');
            this.load();
          },
          error: () => this.message.error('حدث خطأ أثناء الحذف'),
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  truncate(text: string, max = 80): string {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }
}
