import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
import { AssetSortingQuery, TafsirFilters, TafsirItem } from '../../models/tafsirs.models';
import { TafsirsService } from '../../services/tafsirs.service';
import { TafsirFiltersComponent } from '../tafsir-filters/tafsir-filters.component';
import { AdminListBase } from '../../../utils/admin-list-base';

@Component({
  selector: 'app-tafsirs-list',
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
    TafsirFiltersComponent,
    AdminColumnPickerComponent,
    TranslateModule,
  ],
  templateUrl: './tafsirs-list.component.html',
  styleUrl: './tafsirs-list.component.less',
})
export class TafsirsListComponent extends AdminListBase<TafsirItem, TafsirFilters> {
  private readonly tafsirsService = inject(TafsirsService);

  readonly tafsirTableStorageKey = 'admin-list-tafsirs';
  readonly tafsirTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.TAFSIRS.COLUMNS.NAME' },
    { key: 'description', label: 'ADMIN.TAFSIRS.COLUMNS.DESCRIPTION' },
    { key: 'publisher', label: 'ADMIN.TAFSIRS.COLUMNS.PUBLISHER' },
    { key: 'license', label: 'ADMIN.TAFSIRS.COLUMNS.LICENSE' },
    { key: 'created', label: 'ADMIN.TAFSIRS.COLUMNS.CREATED_AT' },
  ];

  readonly licensesColors = LicensesColors;

  constructor() {
    super();
    this.initList(this.tafsirTableStorageKey);
  }

  load(): void {
    this.loading.set(true);
    this.tafsirsService
      .getList({
        page: this.page(),
        page_size: this.pageSize(),
        ...this.activeFilters,
        ordering: this.ordering as AssetSortingQuery,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
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
