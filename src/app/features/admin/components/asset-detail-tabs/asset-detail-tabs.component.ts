import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { AssetUsageSectionComponent } from '../../../usage/components/asset-usage-section/asset-usage-section.component';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';

/** Query param value of the Analytics tab; the Details tab has no param. */
export const ASSET_ANALYTICS_TAB = 'analytics';

/**
 * Details / Analytics tabs of an asset's admin page. The projected content is the Details tab.
 * The Analytics tab (usage dashboard) renders on first open only, so the Details tab sends no
 * usage requests, and it is kept in the URL as `?tab=analytics`. Without `portal_read_usage`
 * there is no Analytics tab, so the content shows without tabs.
 */
@Component({
  selector: 'app-asset-detail-tabs',
  standalone: true,
  imports: [AssetUsageSectionComponent, NgTemplateOutlet, NzTabsModule, TranslateModule],
  template: `
    <ng-template #details><ng-content /></ng-template>
    @if (canReadUsage()) {
      <nz-tabs
        class="asset-detail-tabs"
        [nzSelectedIndex]="selectedIndex()"
        (nzSelectedIndexChange)="onTabChange($event)"
      >
        <nz-tab [nzTitle]="'USAGE.ASSET_TABS.DETAILS' | translate">
          <ng-container [ngTemplateOutlet]="details" />
        </nz-tab>
        <nz-tab [nzTitle]="'USAGE.ASSET_TABS.ANALYTICS' | translate">
          <ng-template nz-tab>
            <app-asset-usage-section [assetId]="assetId()" [category]="category()" />
          </ng-template>
        </nz-tab>
      </nz-tabs>
    } @else {
      <ng-container [ngTemplateOutlet]="details" />
    }
  `,
  styles: `
    .asset-detail-tabs {
      margin-top: 16px;
    }
  `,
})
export class AssetDetailTabsComponent {
  readonly assetId = input.required<number>();
  readonly category = input.required<string>();

  private readonly adminAuth = inject(AdminAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap);

  readonly canReadUsage = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_USAGE)
  );
  readonly selectedIndex = computed(() =>
    this.queryParams()?.get('tab') === ASSET_ANALYTICS_TAB ? 1 : 0
  );

  onTabChange(index: number): void {
    if (index === this.selectedIndex()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: index === 1 ? ASSET_ANALYTICS_TAB : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
