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
    NzButtonModule,
    NzPaginationModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    NgIcon,
    TranslationFiltersComponent,
    AdminColumnPickerComponent,
    TranslateModule,
  ],
  templateUrl: './translations-list.component.html',
  styleUrl: './translations-list.component.less',
})
export class TranslationsListComponent {
  private readonly translationsService = inject(TranslationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sortPrefs = inject(AdminTableSortPrefsService);

  readonly translations = signal<TranslationItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  readonly translationTableStorageKey = 'admin-list-translations';
  readonly translationTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.TRANSLATIONS.COLUMNS.NAME' },
    { key: 'description', label: 'ADMIN.TRANSLATIONS.COLUMNS.DESCRIPTION' },
    { key: 'publisher', label: 'ADMIN.TRANSLATIONS.COLUMNS.PUBLISHER' },
    { key: 'license', label: 'ADMIN.TRANSLATIONS.COLUMNS.LICENSE' },
    { key: 'created', label: 'ADMIN.TRANSLATIONS.COLUMNS.CREATED_AT' },
  ];
  private readonly columnVisibility = signal<Record<string, boolean>>({});

  activeFilters: Partial<TranslationFilters> = {};
  private ordering: AssetSortingQuery | undefined;

  readonly licensesColors = LicensesColors;

  constructor() {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params) => {
      const page = params['page'] ? Number(params['page']) : 1;
      const pageSize = params['page_size'] ? Number(params['page_size']) : 10;

      let ordering = params['ordering'];
      if (!ordering) {
        ordering = this.sortPrefs.load(this.translationTableStorageKey);
      } else {
        this.sortPrefs.save(this.translationTableStorageKey, ordering);
      }

      const activeFilters: Partial<TranslationFilters> = Object.fromEntries(
        Object.entries(params).filter(([k]) => !['page', 'page_size', 'ordering'].includes(k))
      );

      this.page.set(page);
      this.pageSize.set(pageSize);
      this.ordering = ordering as AssetSortingQuery;
      this.activeFilters = activeFilters;

      this.load();
    });
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

  onFiltersChange(filters: Partial<TranslationFilters>): void {
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
      this.sortPrefs.clear(this.translationTableStorageKey);
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
    void this.router.navigate(['/admin/translations', slug]);
  }

  onEdit(slug: string): void {
    void this.router.navigate(['/admin/translations', slug, 'edit']);
  }

  onTranslationColumnVisibility(v: Record<string, boolean>): void {
    this.columnVisibility.set(v);
  }

  showTranslationCol(key: string): boolean {
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
