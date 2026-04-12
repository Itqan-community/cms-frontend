import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NgIcon } from '@ng-icons/core';
import { ReciterListFilters, ReciterListItem, ReciterSorting } from '../../models/reciters.models';
import { RecitersAdminService } from '../../services/reciters.service';
import { localizeCountryCodeOrName } from '../../../utils/display-localization.util';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
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
export class RecitersListComponent implements OnInit {
  private readonly recitersService = inject(RecitersAdminService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

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
