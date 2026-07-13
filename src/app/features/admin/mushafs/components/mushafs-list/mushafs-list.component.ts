import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
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
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminListBase } from '../../../utils/admin-list-base';
import { AssetSortingQuery, MushafFilters, MushafItem } from '../../models/mushafs.models';
import { MushafsService } from '../../services/mushafs.service';
import { canCreateMushaf, canUpdateMushaf } from '../../utils/mushaf-permissions.util';
import { MushafFiltersComponent } from '../mushaf-filters/mushaf-filters.component';

@Component({
  selector: 'app-mushafs-list',
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
    MushafFiltersComponent,
    AdminColumnPickerComponent,
    TranslateModule,
  ],
  templateUrl: './mushafs-list.component.html',
  styleUrl: './mushafs-list.component.less',
})
export class MushafsListComponent extends AdminListBase<MushafItem, MushafFilters> {
  private readonly mushafsService = inject(MushafsService);
  private readonly adminAuth = inject(AdminAuthService);

  readonly canCreateMushaf = computed(() => canCreateMushaf(this.adminAuth));
  readonly canUpdateMushaf = computed(() => canUpdateMushaf(this.adminAuth));

  readonly mushafTableStorageKey = 'admin-list-mushafs';
  readonly mushafTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.MUSHAFS.COLUMNS.NAME' },
    { key: 'access', label: 'ADMIN.COMMON.COLUMN_ACCESS' },
    { key: 'description', label: 'ADMIN.MUSHAFS.COLUMNS.DESCRIPTION' },
    { key: 'publisher', label: 'ADMIN.MUSHAFS.COLUMNS.PUBLISHER' },
    { key: 'license', label: 'ADMIN.MUSHAFS.COLUMNS.LICENSE' },
    { key: 'created', label: 'ADMIN.MUSHAFS.COLUMNS.CREATED_AT' },
  ];

  readonly licensesColors = LicensesColors;

  constructor() {
    super();
    this.initList(this.mushafTableStorageKey);
  }

  load(): void {
    this.loading.set(true);
    this.mushafsService
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
      return this.translate.instant('COMMON.EM_DASH');
    }
    const t = text.trim();
    if (t.length <= max) {
      return t;
    }
    return `${t.slice(0, max)}…`;
  }
}
