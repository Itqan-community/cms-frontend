import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PORTAL_PERMISSIONS } from '../../../admin/constants/portal-permission.constants';
import { AdminAuthService } from '../../../admin/services/admin-auth.service';
import { UsageDashboardComponent } from '../usage-dashboard/usage-dashboard.component';

/** "Usage" section of an asset's admin page: the dashboard configured for the asset's category. */
@Component({
  selector: 'app-asset-usage-section',
  standalone: true,
  imports: [TranslateModule, UsageDashboardComponent],
  template: `
    @if (canRead()) {
      <section class="asset-usage">
        <h2 class="asset-usage__title">{{ 'USAGE.ASSET_SECTION_TITLE' | translate }}</h2>
        <app-usage-dashboard
          [scope]="scope()"
          [assetId]="assetId()"
          [category]="category()"
          [syncUrl]="false"
        />
      </section>
    }
  `,
  styles: `
    .asset-usage {
      margin-top: 24px;
    }
    .asset-usage__title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
    }
  `,
})
export class AssetUsageSectionComponent {
  readonly assetId = input.required<number>();
  readonly category = input.required<string>();

  private readonly adminAuth = inject(AdminAuthService);

  readonly canRead = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_USAGE)
  );
  readonly scope = computed(() => (this.adminAuth.isItqanAdmin() ? 'admin' : 'publisher'));
}
