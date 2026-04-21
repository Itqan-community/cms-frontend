import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
import {
  formatHijriYearForAdminListing,
  localizeCountryCodeOrName,
} from '../../../utils/display-localization.util';
import { Publisher, PublisherUiFilters } from '../../models/publishers-stats.models';
import { PublishersService } from '../../services/publishers.service';
import { PublisherFiltersComponent } from '../publisher-filters/publisher-filters.component';
import { AdminListBase } from '../../../utils/admin-list-base';

@Component({
  selector: 'app-publishers-list',
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
    PublisherFiltersComponent,
    AdminColumnPickerComponent,
    TranslateModule,
  ],
  templateUrl: './publishers-list.component.html',
  styleUrl: './publishers-list.component.less',
})
export class PublishersListComponent extends AdminListBase<Publisher, PublisherUiFilters> {
  private readonly publishersService = inject(PublishersService);
  private readonly translate = inject(TranslateService);

  readonly publisherTableStorageKey = 'admin-list-publishers';
  readonly publisherTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.PUBLISHERS.COLUMNS.NAME' },
    { key: 'country', label: 'ADMIN.PUBLISHERS.COLUMNS.COUNTRY' },
    { key: 'foundation_year', label: 'ADMIN.PUBLISHERS.COLUMNS.FOUNDATION_YEAR' },
    { key: 'created', label: 'ADMIN.PUBLISHERS.COLUMNS.CREATED_AT' },
  ];

  constructor() {
    super();
    this.initList(this.publisherTableStorageKey);
  }

  load(): void {
    this.loading.set(true);
    this.publishersService
      .getPublishers({
        page: this.page(),
        page_size: this.pageSize(),
        ...this.activeFilters,
        ordering: this.ordering,
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

  countryLabel(country: string | null | undefined): string {
    return localizeCountryCodeOrName(country, this.translate.currentLang);
  }

  foundationYearDisplay(year: number | null | undefined): string {
    return formatHijriYearForAdminListing(year, {
      suffix: this.translate.instant('ADMIN.COMMON.HIJRI_YEAR_SUFFIX'),
      empty: this.translate.instant('ADMIN.COMMON.EM_DASH'),
    });
  }
}
