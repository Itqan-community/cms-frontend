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
  TranslationFilters,
  TranslationItem,
} from '../../models/translations.models';
import { TranslationsService } from '../../services/translations.service';
import { TranslationFiltersComponent } from '../translation-filters/translation-filters.component';

@Component({
  selector: 'app-translations-list',
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
    TranslationFiltersComponent,
  ],
  templateUrl: './translations-list.component.html',
  styleUrl: './translations-list.component.less',
})
export class TranslationsListComponent implements OnInit {
  private readonly translationsService = inject(TranslationsService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);

  readonly translations = signal<TranslationItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  private activeFilters: Partial<TranslationFilters> = {};
  private ordering: AssetSortingQuery | undefined;

  readonly licensesColors = LicensesColors;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.translationsService
      .getList({
        page: this.page(),
        page_size: this.pageSize(),
        ...this.activeFilters,
        ordering: this.ordering,
      })
      .subscribe({
        next: (res) => {
          this.translations.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.message.error('تعذر تحميل الترجمات. يرجى المحاولة لاحقاً.');
          this.loading.set(false);
        },
      });
  }

  onFiltersChange(filters: Partial<TranslationFilters>): void {
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
    void this.router.navigate(['/admin/translations', id]);
  }

  onEdit(id: number): void {
    void this.router.navigate(['/admin/translations', id, 'edit']);
  }

  onDelete(item: TranslationItem): void {
    this.modal.confirm({
      nzTitle: 'هل أنت متأكد من حذف هذه الترجمة؟',
      nzContent: `<b>${item.name}</b> — هذا الإجراء لا يمكن التراجع عنه.`,
      nzOkText: 'نعم، احذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        this.translationsService.delete(item.id).subscribe({
          next: () => {
            this.message.success('تم حذف الترجمة بنجاح');
            this.load();
          },
          error: () => this.message.error('حدث خطأ أثناء الحذف'),
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  truncate(text: string | null | undefined, max = 80): string {
    const s = text ?? '';
    return s.length > max ? s.slice(0, max) + '…' : s;
  }
}
