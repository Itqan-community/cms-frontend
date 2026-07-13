import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
import { ReciterListFilters, ReciterListItem, ReciterSorting } from '../../models/reciters.models';
import { RecitersAdminService } from '../../services/reciters.service';
import { ReciterFiltersComponent } from '../reciter-filters/reciter-filters.component';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminListBase } from '../../../utils/admin-list-base';
import { AdminCountryLabelPipe } from '../../../pipes/admin-country-label.pipe';

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
    AdminCountryLabelPipe,
  ],
  templateUrl: './reciters-list.component.html',
  styleUrl: './reciters-list.component.less',
})
export class RecitersListComponent extends AdminListBase<ReciterListItem, ReciterListFilters> {
  private readonly recitersService = inject(RecitersAdminService);
  private readonly adminAuth = inject(AdminAuthService);

  readonly canCreateReciter = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_RECITER)
  );

  readonly canUpdateReciter = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_RECITER)
  );

  readonly reciterTableStorageKey = 'admin-list-reciters';
  readonly reciterTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.RECITERS.COLUMNS.NAME' },
    { key: 'bio', label: 'ADMIN.RECITERS.COLUMNS.BIO' },
    { key: 'nationality', label: 'ADMIN.RECITERS.COLUMNS.NATIONALITY' },
    { key: 'recitations_count', label: 'ADMIN.RECITERS.COLUMNS.RECITATIONS_COUNT' },
    { key: 'created', label: 'ADMIN.RECITERS.COLUMNS.CREATED_AT' },
  ];

  constructor() {
    super();
    this.initList(this.reciterTableStorageKey);
  }

  load(): void {
    this.loading.set(true);
    this.recitersService
      .getList({
        page: this.page(),
        page_size: this.pageSize(),
        ...this.activeFilters,
        ordering: this.ordering as ReciterSorting,
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
