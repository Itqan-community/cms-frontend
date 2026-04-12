import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NgIcon } from '@ng-icons/core';
import { Publisher, PublisherUiFilters } from '../../models/publishers-stats.models';
import { PublishersService } from '../../services/publishers.service';
import { localizeCountryCodeOrName } from '../../../utils/display-localization.util';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
import { PublisherFiltersComponent } from '../publisher-filters/publisher-filters.component';

@Component({
  selector: 'app-publishers-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzButtonModule,
    NzPaginationModule,
    NzSpinModule,
    NzTableModule,
    NzToolTipModule,
    NgIcon,
    PublisherFiltersComponent,
    AdminColumnPickerComponent,
  ],
  templateUrl: './publishers-list.component.html',
  styleUrl: './publishers-list.component.less',
})
export class PublishersListComponent implements OnInit {
  private readonly publishersService = inject(PublishersService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly publishers = signal<Publisher[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  readonly publisherTableStorageKey = 'admin-list-publishers';
  readonly publisherTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'الاسم' },
    { key: 'country', label: 'الدولة' },
    { key: 'description', label: 'الوصف' },
    { key: 'created', label: 'تاريخ الإضافة' },
  ];
  private readonly columnVisibility = signal<Record<string, boolean>>({});

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

  onPublisherColumnVisibility(v: Record<string, boolean>): void {
    this.columnVisibility.set(v);
  }

  showPublisherCol(key: string): boolean {
    return this.columnVisibility()[key] !== false;
  }

  countryLabel(country: string | null | undefined): string {
    return localizeCountryCodeOrName(country, this.translate.currentLang);
  }

  publisherDescriptionPreview(p: Publisher): string {
    const raw = p.description_ar ?? p.description_en ?? p.description ?? '';
    return this.truncate(raw);
  }

  private truncate(text: string | null | undefined, max = 120): string {
    if (text == null || text === '') {
      return '—';
    }
    const t = text.trim();
    if (t.length <= max) {
      return t;
    }
    return `${t.slice(0, max)}…`;
  }
}
