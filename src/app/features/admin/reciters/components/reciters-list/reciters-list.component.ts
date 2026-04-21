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
import { localizeCountryCodeOrName } from '../../../utils/display-localization.util';
import { ReciterListFilters, ReciterListItem, ReciterSorting } from '../../models/reciters.models';
import { RecitersAdminService } from '../../services/reciters.service';
import { ReciterFiltersComponent } from '../reciter-filters/reciter-filters.component';

@Component({
  selector: 'app-reciters-list',
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
    ReciterFiltersComponent,
    AdminColumnPickerComponent,
    TranslateModule,
  ],
  templateUrl: './reciters-list.component.html',
  styleUrl: './reciters-list.component.less',
})
export class RecitersListComponent {
  private readonly recitersService = inject(RecitersAdminService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly sortPrefs = inject(AdminTableSortPrefsService);

  readonly reciters = signal<ReciterListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  readonly reciterTableStorageKey = 'admin-list-reciters';
  readonly reciterTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.RECITERS.COLUMNS.NAME' },
    { key: 'bio', label: 'ADMIN.RECITERS.COLUMNS.BIO' },
    { key: 'nationality', label: 'ADMIN.RECITERS.COLUMNS.NATIONALITY' },
    { key: 'recitations_count', label: 'ADMIN.RECITERS.COLUMNS.RECITATIONS_COUNT' },
    { key: 'created', label: 'ADMIN.RECITERS.COLUMNS.CREATED_AT' },
  ];
  private readonly columnVisibility = signal<Record<string, boolean>>({});

  activeFilters: Partial<ReciterListFilters> = {};
  private ordering: ReciterSorting | undefined;

  constructor() {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params) => {
      const page = params['page'] ? Number(params['page']) : 1;
      const pageSize = params['page_size'] ? Number(params['page_size']) : 10;

      let ordering = params['ordering'];
      if (!ordering) {
        ordering = this.sortPrefs.load(this.reciterTableStorageKey);
      } else {
        this.sortPrefs.save(this.reciterTableStorageKey, ordering);
      }

      const activeFilters: Partial<ReciterListFilters> = Object.fromEntries(
        Object.entries(params).filter(([k]) => !['page', 'page_size', 'ordering'].includes(k))
      );

      this.page.set(page);
      this.pageSize.set(pageSize);
      this.ordering = ordering as ReciterSorting;
      this.activeFilters = activeFilters;

      this.load();
    });
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
    // Clean up defaults/nulls for cleaner URL
    for (const key in queryParams) {
      if (queryParams[key] === null) {
        queryParams[key] = null; // router merges null as delete
      }
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  onFiltersChange(filters: Partial<ReciterListFilters>): void {
    this.updateUrl({ ...filters, page: null }); // Reset to page 1
  }

  onPageChange(page: number): void {
    this.updateUrl({ page: page > 1 ? page : null });
  }

  onPageSizeChange(size: number): void {
    this.updateUrl({ page_size: size !== 10 ? size : null, page: null });
  }

  onSortChange(
    column: 'name' | 'recitations_count' | 'created_at' | 'updated_at',
    order: NzTableSortOrder
  ): void {
    let ordering: string | null = null;
    if (order) {
      const prefix = order === 'descend' ? '-' : '';
      ordering = `${prefix}${column}`;
    } else {
      this.sortPrefs.clear(this.reciterTableStorageKey);
    }
    this.updateUrl({ ordering, page: null });
  }

  getSortOrder(column: string): NzTableSortOrder {
    if (!this.ordering) return null;
    if (this.ordering === column) return 'ascend';
    if (this.ordering === `-${column}`) return 'descend';
    return null;
  }

  onView(slug: string): void {
    void this.router.navigate(['/admin/reciters', slug]);
  }

  onEdit(slug: string): void {
    void this.router.navigate(['/admin/reciters', slug, 'edit']);
  }

  onReciterColumnVisibility(v: Record<string, boolean>): void {
    this.columnVisibility.set(v);
  }

  showReciterCol(key: string): boolean {
    return this.columnVisibility()[key] !== false;
  }

  countryLabel(country: string | null | undefined): string {
    return localizeCountryCodeOrName(country, this.translate.currentLang);
  }

  truncate(text: string | null | undefined, max = 120): string {
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
