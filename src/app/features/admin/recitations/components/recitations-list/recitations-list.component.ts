import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
import {
  RecitationListFilters,
  RecitationListItem,
  RecitationSorting,
} from '../../models/recitations.models';
import { RecitationsService } from '../../services/recitations.service';
import { RecitationFiltersComponent } from '../recitation-filters/recitation-filters.component';
import { AdminListBase } from '../../../utils/admin-list-base';
import { AdminHijriYearPipe } from '../../../pipes/admin-hijri-year.pipe';

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
    AdminHijriYearPipe,
  ],
  templateUrl: './recitations-list.component.html',
  styleUrl: './recitations-list.component.less',
})
export class RecitationsListComponent extends AdminListBase<
  RecitationListItem,
  RecitationListFilters
> {
  private readonly recitationsService = inject(RecitationsService);
  private readonly translate = inject(TranslateService);

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

  readonly licensesColors = LicensesColors;

  constructor() {
    super();
    this.initList(this.recitationTableStorageKey);
  }

  load(): void {
    this.loading.set(true);
    this.recitationsService
      .getList({
        page: this.page(),
        page_size: this.pageSize(),
        ...this.activeFilters,
        ordering: this.ordering as RecitationSorting,
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
