import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NgIcon } from '@ng-icons/core';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import {
  AssetSortingQuery,
  TranslationFilters,
  TranslationItem,
} from '../../models/translations.models';
import { TranslationsService } from '../../services/translations.service';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
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
export class TranslationsListComponent implements OnInit {
  private readonly translationsService = inject(TranslationsService);
  private readonly router = inject(Router);

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

  onSortChange(column: 'name' | 'created_at', order: NzTableSortOrder): void {
    if (!order) {
      this.ordering = undefined;
    } else {
      const prefix = order === 'descend' ? '-' : '';
      this.ordering = `${prefix}${column}` as AssetSortingQuery;
    }
    this.page.set(1);
    this.load();
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
