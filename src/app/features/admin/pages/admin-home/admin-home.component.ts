import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-resolver.util';
import {
  buildAuthorizedAdminTabs,
  CmsTab,
  TAB_FONTS,
  TAB_MUSHAFS,
  TAB_RECITATIONS,
  TAB_TEXT_ASSETS,
} from '../../layout/admin-sidebar.component';
import { AdminAuthService } from '../../services/admin-auth.service';
import {
  AssetCategoryCount,
  AssetCountsService,
  CountedAssetCategory,
} from '../../services/asset-counts.service';

/** Each counted type opens the same list as its sidebar module. */
const CATEGORY_TABS: Record<CountedAssetCategory, CmsTab> = {
  text: TAB_TEXT_ASSETS,
  mushaf: TAB_MUSHAFS,
  font: TAB_FONTS,
  recitation: TAB_RECITATIONS,
};

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [
    RouterLink,
    NzAlertModule,
    NzCardModule,
    NzGridModule,
    NzSkeletonModule,
    NgIcon,
    TranslateModule,
  ],
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.less'],
})
export class AdminHomeComponent implements OnInit {
  private readonly adminAuth = inject(AdminAuthService);
  private readonly assetCountsService = inject(AssetCountsService);
  private readonly translate = inject(TranslateService);

  readonly sections = computed(() =>
    buildAuthorizedAdminTabs(this.adminAuth, { includeHome: false }).map((tab) => ({
      titleKey: tab.label,
      descriptionKey: tab.description,
      icon: tab.icon,
      route: `/admin/${tab.path}`,
    }))
  );

  readonly countsLoading = signal(true);
  readonly countsError = signal<string | null>(null);
  private readonly counts = signal<AssetCategoryCount[]>([]);

  /** Types the backend did not return (no permission, no portal list) are not shown. */
  readonly assetCounts = computed(() =>
    this.counts()
      .filter((row) => CATEGORY_TABS[row.category])
      .map((row) => {
        const tab = CATEGORY_TABS[row.category];
        return { ...row, labelKey: tab.label, icon: tab.icon, route: `/admin/${tab.path}` };
      })
  );

  ngOnInit(): void {
    // A publisher switch reloads the page, so one request per visit is enough.
    this.assetCountsService.get().subscribe({
      next: (response) => {
        this.counts.set(response.categories);
        this.countsLoading.set(false);
      },
      error: (err: unknown) => {
        console.error('[AdminHome] Failed to load asset counts', err);
        this.countsError.set(
          resolveApiErrorMessage(err, { fallbackKey: 'ADMIN.HOME.COUNTS_ERROR' }, this.translate)
        );
        this.countsLoading.set(false);
      },
    });
  }
}
