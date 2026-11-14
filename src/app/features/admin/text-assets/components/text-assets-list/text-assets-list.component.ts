import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AdminTitleCountComponent } from '../../../components/admin-title-count/admin-title-count.component';
import { AdminTablePaginationComponent } from '../../../components/admin-table-pagination/admin-table-pagination.component';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import { AssetTemplateBadgeComponent } from '../../../../../shared/components/asset-template-badge/asset-template-badge.component';
import {
  AdminColumnPickerComponent,
  AdminTableColumnOption,
} from '../../../components/admin-column-picker/admin-column-picker.component';
import {
  AssetSortingQuery,
  TextAssetFilters,
  TextAssetItem,
} from '../../models/text-assets.models';
import { TextAssetsService } from '../../services/text-assets.service';
import { TextAssetFiltersComponent } from '../text-asset-filters/text-asset-filters.component';
import { AdminListBase } from '../../../utils/admin-list-base';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AssetChannelTagsComponent } from '../../../components/asset-channels/asset-channels.component';

@Component({
  selector: 'app-text-assets-list',
  standalone: true,
  imports: [
    AssetChannelTagsComponent,
    DatePipe,
    RouterLink,
    NzButtonModule,
    AdminTitleCountComponent,
    AdminTablePaginationComponent,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    NgIcon,
    TextAssetFiltersComponent,
    AdminColumnPickerComponent,
    TranslateModule,
    AssetTemplateBadgeComponent,
  ],
  templateUrl: './text-assets-list.component.html',
  styleUrl: './text-assets-list.component.less',
})
export class TextAssetsListComponent extends AdminListBase<TextAssetItem, TextAssetFilters> {
  private readonly textAssetsService = inject(TextAssetsService);
  private readonly adminAuth = inject(AdminAuthService);

  readonly canCreateTextAsset = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_TEXT_ASSET)
  );

  readonly canUpdateTextAsset = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_TEXT_ASSET)
  );

  readonly textAssetTableStorageKey = 'admin-list-text-assets';
  readonly textAssetTableColumns: AdminTableColumnOption[] = [
    { key: 'name', label: 'ADMIN.TEXT_ASSETS.COLUMNS.NAME' },
    { key: 'tags', label: 'ADMIN.TEXT_ASSETS.COLUMNS.TAGS' },
    { key: 'access', label: 'ADMIN.COMMON.COLUMN_ACCESS' },
    { key: 'description', label: 'ADMIN.TEXT_ASSETS.COLUMNS.DESCRIPTION' },
    { key: 'publisher', label: 'ADMIN.TEXT_ASSETS.COLUMNS.PUBLISHER' },
    { key: 'license', label: 'ADMIN.TEXT_ASSETS.COLUMNS.LICENSE' },
    { key: 'created', label: 'ADMIN.TEXT_ASSETS.COLUMNS.CREATED_AT' },
  ];

  readonly licensesColors = LicensesColors;

  constructor() {
    super();
    this.initList(this.textAssetTableStorageKey);
  }

  load(): void {
    this.loading.set(true);
    this.textAssetsService
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
