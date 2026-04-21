import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
import { AdminTableSortPrefsService } from '../../../services/admin-table-sort-prefs.service';
import {
  RecitationListFilters,
  RecitationListItem,
  RecitationSorting,
} from '../../models/recitations.models';
import { RecitationsService } from '../../services/recitations.service';
import { RecitationFiltersComponent } from '../recitation-filters/recitation-filters.component';

@Component({
  selector: 'app-recitations-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzButtonModule,
    NzPaginationModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    NgIcon,
    RecitationFiltersComponent,
    AdminColumnPickerComponent,
    TranslateModule,
  ],
  templateUrl: './recitations-list.component.html',
  styleUrl: './recitations-list.component.less',
})
export class RecitationsListComponent {
  private readonly recitationsService = inject(RecitationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sortPrefs = inject(AdminTableSortPrefsService);

  readonly recitations = signal<RecitationListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  readonly recitationTableStorageKey = 'admin-list-recitations';
  readonly recitationTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.RECITATIONS.COLUMNS.NAME' },
    { key: 'description', label: 'ADMIN.RECITATIONS.COLUMNS.DESCRIPTION' },
    { key: 'publisher', label: 'ADMIN.RECITATIONS.COLUMNS.PUBLISHER' },
    { key: 'reciter', label: 'ADMIN.RECITATIONS.COLUMNS.RECITER' },
    { key: 'qiraah', label: 'ADMIN.RECITATIONS.COLUMNS.QIRAAH' },
    { key: 'year', label: 'ADMIN.RECITATIONS.COLUMNS.YEAR' },
    { key: 'license', label: 'ADMIN.RECITATIONS.COLUMNS.LICENSE' },
    { key: 'created', label: 'ADMIN.RECITATIONS.COLUMNS.CREATED_AT' },
  ];
  private readonly columnVisibility = signal<Record<string, boolean>>({});

  activeFilters: Partial<RecitationListFilters> = {};
  private ordering: RecitationSorting | undefined;

  readonly licensesColors = LicensesColors;

  constructor() {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params) => {
      const page = params['page'] ? Number(params['page']) : 1;
      const pageSize = params['page_size'] ? Number(params['page_size']) : 10;

      let ordering = params['ordering'];
      if (!ordering) {
        ordering = this.sortPrefs.load(this.recitationTableStorageKey);
      } else {
        this.sortPrefs.save(this.recitationTableStorageKey, ordering);
      }

      const activeFilters: Partial<RecitationListFilters> = Object.fromEntries(
        Object.entries(params).filter(([k]) => !['page', 'page_size', 'ordering'].includes(k))
      );

      this.page.set(page);
      this.pageSize.set(pageSize);
      this.ordering = ordering as RecitationSorting;
      this.activeFilters = activeFilters;

      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.recitationsService
      .getList({
        page: this.page(),
        page_size: this.pageSize(),
        ...this.activeFilters,
        ordering: this.ordering,
      })
      .subscribe({
        next: (res) => {
          this.recitations.set(res.results);
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

  onFiltersChange(filters: Partial<RecitationListFilters>): void {
    this.updateUrl({ ...filters, page: null });
  }

  onPageChange(page: number): void {
    this.updateUrl({ page: page > 1 ? page : null });
  }

  onPageSizeChange(size: number): void {
    this.updateUrl({ page_size: size !== 10 ? size : null, page: null });
  }

  onSortChange(column: 'name' | 'year' | 'license' | 'created_at', order: NzTableSortOrder): void {
    let ordering: string | null = null;
    if (order) {
      const prefix = order === 'descend' ? '-' : '';
      ordering = `${prefix}${column}`;
    } else {
      this.sortPrefs.clear(this.recitationTableStorageKey);
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
    void this.router.navigate(['/admin/recitations', slug]);
  }

  onEdit(slug: string): void {
    void this.router.navigate(['/admin/recitations', slug, 'edit']);
  }

  onRecitationColumnVisibility(v: Record<string, boolean>): void {
    this.columnVisibility.set(v);
  }

  showRecitationCol(key: string): boolean {
    return this.columnVisibility()[key] !== false;
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
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
