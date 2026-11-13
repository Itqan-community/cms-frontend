import { Component, computed, inject, input } from '@angular/core';
import { PORTAL_PERMISSIONS } from '../../../admin/constants/portal-permission.constants';
import { AdminAuthService } from '../../../admin/services/admin-auth.service';
import { UsageDashboardComponent } from '../usage-dashboard/usage-dashboard.component';

/** Analytics tab of an asset's admin page: the dashboard configured for the asset's category. */
@Component({
  selector: 'app-asset-usage-section',
  standalone: true,
  imports: [UsageDashboardComponent],
  template: `
    @if (canRead()) {
      <app-usage-dashboard
        [scope]="scope()"
        [assetId]="assetId()"
        [category]="category()"
        [syncUrl]="false"
      />
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
  readonly scope = computed(() => (this.adminAuth.isStaff() ? 'admin' : 'publisher'));
}
