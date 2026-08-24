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
import { AssetSortingQuery, ProgramFilters, ProgramItem } from '../../models/programs.models';
import { ProgramsService } from '../../services/programs.service';
import { canCreateProgram, canUpdateProgram } from '../../utils/program-permissions.util';
import { ProgramFiltersComponent } from '../program-filters/program-filters.component';

@Component({
  selector: 'app-programs-list',
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
    ProgramFiltersComponent,
    AdminColumnPickerComponent,
    TranslateModule,
  ],
  templateUrl: './programs-list.component.html',
  styleUrl: './programs-list.component.less',
})
export class ProgramsListComponent extends AdminListBase<ProgramItem, ProgramFilters> {
  private readonly programsService = inject(ProgramsService);
  private readonly adminAuth = inject(AdminAuthService);

  readonly canCreateProgram = computed(() => canCreateProgram(this.adminAuth));
  readonly canUpdateProgram = computed(() => canUpdateProgram(this.adminAuth));

  readonly programTableStorageKey = 'admin-list-programs';
  readonly programTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.PROGRAMS.COLUMNS.NAME' },
    { key: 'access', label: 'ADMIN.COMMON.COLUMN_ACCESS' },
    { key: 'description', label: 'ADMIN.PROGRAMS.COLUMNS.DESCRIPTION' },
    { key: 'publisher', label: 'ADMIN.PROGRAMS.COLUMNS.PUBLISHER' },
    { key: 'license', label: 'ADMIN.PROGRAMS.COLUMNS.LICENSE' },
    { key: 'created', label: 'ADMIN.PROGRAMS.COLUMNS.CREATED_AT' },
  ];

  readonly licensesColors = LicensesColors;

  constructor() {
    super();
    this.initList(this.programTableStorageKey);
  }

  load(): void {
    this.loading.set(true);
    this.programsService
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
