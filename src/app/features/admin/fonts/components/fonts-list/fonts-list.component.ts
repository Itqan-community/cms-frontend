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
import { AssetSortingQuery, FontFilters, FontItem } from '../../models/fonts.models';
import { FontsService } from '../../services/fonts.service';
import { canCreateFont, canUpdateFont } from '../../utils/font-permissions.util';
import { FontFiltersComponent } from '../font-filters/font-filters.component';

@Component({
  selector: 'app-fonts-list',
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
    FontFiltersComponent,
    AdminColumnPickerComponent,
    TranslateModule,
  ],
  templateUrl: './fonts-list.component.html',
  styleUrl: './fonts-list.component.less',
})
export class FontsListComponent extends AdminListBase<FontItem, FontFilters> {
  private readonly fontsService = inject(FontsService);
  private readonly adminAuth = inject(AdminAuthService);

  readonly canCreateFont = computed(() => canCreateFont(this.adminAuth));
  readonly canUpdateFont = computed(() => canUpdateFont(this.adminAuth));

  readonly fontTableStorageKey = 'admin-list-fonts';
  readonly fontTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.FONTS.COLUMNS.NAME' },
    { key: 'access', label: 'ADMIN.COMMON.COLUMN_ACCESS' },
    { key: 'description', label: 'ADMIN.FONTS.COLUMNS.DESCRIPTION' },
    { key: 'publisher', label: 'ADMIN.FONTS.COLUMNS.PUBLISHER' },
    { key: 'license', label: 'ADMIN.FONTS.COLUMNS.LICENSE' },
    { key: 'created', label: 'ADMIN.FONTS.COLUMNS.CREATED_AT' },
  ];

  readonly licensesColors = LicensesColors;

  constructor() {
    super();
    this.initList(this.fontTableStorageKey);
  }

  load(): void {
    this.loading.set(true);
    this.fontsService
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
