import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NgIcon } from '@ng-icons/core';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import {
  RecitationListFilters,
  RecitationListItem,
  RecitationSorting,
} from '../../models/recitations.models';
import { RecitationsService } from '../../services/recitations.service';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
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
  ],
  templateUrl: './recitations-list.component.html',
  styleUrl: './recitations-list.component.less',
})
export class RecitationsListComponent implements OnInit {
  private readonly recitationsService = inject(RecitationsService);
  private readonly router = inject(Router);

  readonly recitations = signal<RecitationListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  readonly recitationTableStorageKey = 'admin-list-recitations';
  readonly recitationTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'الاسم' },
    { key: 'description', label: 'الوصف' },
    { key: 'publisher', label: 'الناشر' },
    { key: 'reciter', label: 'القارئ' },
    { key: 'qiraah', label: 'القراءة' },
    { key: 'year', label: 'السنة' },
    { key: 'license', label: 'الترخيص' },
    { key: 'created', label: 'تاريخ الإضافة' },
  ];
  private readonly columnVisibility = signal<Record<string, boolean>>({});

  private activeFilters: Partial<RecitationListFilters> = {};
  private ordering: RecitationSorting | undefined;

  readonly licensesColors = LicensesColors;

  ngOnInit(): void {
    this.load();
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

  onFiltersChange(filters: Partial<RecitationListFilters>): void {
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

  onSortChange(column: 'name' | 'year' | 'license' | 'created_at', order: NzTableSortOrder): void {
    if (!order) {
      this.ordering = undefined;
    } else {
      const prefix = order === 'descend' ? '-' : '';
      this.ordering = `${prefix}${column}` as RecitationSorting;
    }
    this.page.set(1);
    this.load();
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
