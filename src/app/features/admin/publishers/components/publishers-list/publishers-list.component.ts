import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NgIcon } from '@ng-icons/core';
import { Publisher, PublisherUiFilters } from '../../models/publishers-stats.models';
import { PublishersService } from '../../services/publishers.service';
import { localizeCountryCodeOrName } from '../../../utils/display-localization.util';
import { PublisherFiltersComponent } from '../publisher-filters/publisher-filters.component';

@Component({
  selector: 'app-publishers-list',
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
    NgIcon,
    PublisherFiltersComponent,
  ],
  templateUrl: './publishers-list.component.html',
  styleUrl: './publishers-list.component.less',
})
export class PublishersListComponent implements OnInit {
  private readonly publishersService = inject(PublishersService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly publishers = signal<Publisher[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  private activeFilters: PublisherUiFilters = {};
  private ordering: string | undefined;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.publishersService
      .getPublishers({
        page: this.page(),
        page_size: this.pageSize(),
        ...this.activeFilters,
        ordering: this.ordering,
      })
      .subscribe({
        next: (res) => {
          this.publishers.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  onFiltersChange(filters: PublisherUiFilters): void {
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

  onSortChange(column: 'name' | 'created_at', order: NzTableSortOrder): void {
    if (!order) {
      this.ordering = undefined;
    } else {
      const prefix = order === 'descend' ? '-' : '';
      this.ordering = `${prefix}${column}`;
    }
    this.page.set(1);
    this.load();
  }

  onView(id: number): void {
    void this.router.navigate(['/admin/publishers', id]);
  }

  onEdit(id: number): void {
    void this.router.navigate(['/admin/publishers', id, 'edit']);
  }

  onDelete(item: Publisher): void {
    const name = item.name ?? item.name_ar ?? item.name_en ?? 'هذا الناشر';
    this.modal.confirm({
      nzTitle: 'تأكيد الحذف (Confirm Deletion)',
      nzContent: `<b>${name}</b> — هذا الإجراء لا يمكن التراجع عنه.`,
      nzOkText: 'نعم، احذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        this.publishersService.deletePublisher(item.id).subscribe({
          next: () => {
            this.message.success('تم حذف الناشر بنجاح');
            this.load();
          },
          error: () => {},
        }),
    });
  }

  truncate(text: string | undefined, max = 80): string {
    if (!text) return '—';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  countryLabel(country: string | null | undefined): string {
    return localizeCountryCodeOrName(country, this.translate.currentLang);
  }
}
