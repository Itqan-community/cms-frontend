import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
import { AdminTableSortPrefsService } from '../../../services/admin-table-sort-prefs.service';
import {
  formatHijriYearForAdminListing,
  localizeCountryCodeOrName,
} from '../../../utils/display-localization.util';
import { Publisher, PublisherUiFilters } from '../../models/publishers-stats.models';
import { PublishersService } from '../../services/publishers.service';
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
    TranslateModule,
  ],
  templateUrl: './publishers-list.component.html',
  styleUrl: './publishers-list.component.less',
})
export class PublishersListComponent {
  private readonly publishersService = inject(PublishersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly sortPrefs = inject(AdminTableSortPrefsService);

  readonly publishers = signal<Publisher[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  readonly publisherTableStorageKey = 'admin-list-publishers';
  readonly publisherTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.PUBLISHERS.COLUMNS.NAME' },
    { key: 'country', label: 'ADMIN.PUBLISHERS.COLUMNS.COUNTRY' },
    { key: 'foundation_year', label: 'ADMIN.PUBLISHERS.COLUMNS.FOUNDATION_YEAR' },
    { key: 'created', label: 'ADMIN.PUBLISHERS.COLUMNS.CREATED_AT' },
  ];
  private readonly columnVisibility = signal<Record<string, boolean>>({});

  activeFilters: PublisherUiFilters = {};
  private ordering: string | undefined;

  constructor() {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params) => {
      const page = params['page'] ? Number(params['page']) : 1;
      const pageSize = params['page_size'] ? Number(params['page_size']) : 10;

      let ordering = params['ordering'];
      if (ordering === undefined && !Object.keys(params).includes('ordering')) {
        ordering = this.sortPrefs.load(this.publisherTableStorageKey);
      } else {
        if (ordering) {
          this.sortPrefs.save(this.publisherTableStorageKey, ordering);
        } else {
          this.sortPrefs.clear(this.publisherTableStorageKey);
        }
      }

      const activeFilters: PublisherUiFilters = Object.fromEntries(
        Object.entries(params).filter(([k]) => !['page', 'page_size', 'ordering'].includes(k))
      );

      this.page.set(page);
      this.pageSize.set(pageSize);
      this.ordering = ordering;
      this.activeFilters = activeFilters;

      this.load();
    });
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

  private updateUrl(updates: Record<string, string | number | boolean | null | undefined>): void {
    const queryParams: Record<string, string | number | boolean | null | undefined> = {
      page: this.page() > 1 ? this.page() : null,
      page_size: this.pageSize() !== 10 ? this.pageSize() : null,
      ordering: this.ordering || null,
      search: this.activeFilters.search || null,
      ...updates,
    };
    for (const key in queryParams) {
      if (queryParams[key] === null) {
        queryParams[key] = null;
      }
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  onFiltersChange(filters: PublisherUiFilters): void {
    this.updateUrl({ ...filters, page: null });
  }

  onPageChange(page: number): void {
    this.updateUrl({ page: page > 1 ? page : null });
  }

  onPageSizeChange(size: number): void {
    this.updateUrl({ page_size: size !== 10 ? size : null, page: null });
  }

  onSortChange(column: 'name' | 'created_at', order: NzTableSortOrder): void {
    let ordering: string | null = null;
    if (order) {
      const prefix = order === 'descend' ? '-' : '';
      ordering = `${prefix}${column}`;
    } else {
      this.sortPrefs.clear(this.publisherTableStorageKey);
    }
    this.updateUrl({ ordering, page: null });
  }

  getSortOrder(column: string): NzTableSortOrder {
    if (!this.ordering) return null;
    if (this.ordering === column) return 'ascend';
    if (this.ordering === `-${column}`) return 'descend';
    return null;
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

  foundationYearDisplay(year: number | null | undefined): string {
    return formatHijriYearForAdminListing(year, {
      suffix: this.translate.instant('ADMIN.COMMON.HIJRI_YEAR_SUFFIX'),
      empty: this.translate.instant('ADMIN.COMMON.EM_DASH'),
    });
  }
}
