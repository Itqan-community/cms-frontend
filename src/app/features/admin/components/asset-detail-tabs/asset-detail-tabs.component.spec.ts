import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { UsageApiService } from '../../../usage/services/usage-api.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetDetailTabsComponent } from './asset-detail-tabs.component';

@Component({
  standalone: true,
  imports: [AssetDetailTabsComponent],
  template: `
    <app-asset-detail-tabs [assetId]="7" category="recitation">
      <p class="details-content">Details</p>
    </app-asset-detail-tabs>
  `,
})
class HostPageComponent {}

const USAGE_API_METHODS = [
  'summary',
  'timeseries',
  'breakdown',
  'leaderboard',
  'reconciliation',
  'exportCsv',
  'listeners',
  'cohorts',
  'firstSeen',
  'searchTerms',
  'recitationCoverage',
  'publicCounts',
] as const satisfies readonly (keyof UsageApiService)[];

describe('AssetDetailTabsComponent', () => {
  let harness: RouterTestingHarness;
  let api: jasmine.SpyObj<UsageApiService>;
  const permissions = signal<string[]>([]);

  const element = () => harness.routeNativeElement as HTMLElement;
  const tabTitles = () =>
    Array.from(element().querySelectorAll('.ant-tabs-tab')).map((tab) => tab.textContent?.trim());
  const dashboard = () => element().querySelector('app-usage-dashboard');
  const visibleDetails = () =>
    Array.from(element().querySelectorAll('.details-content')).filter(
      (node) => !node.closest('.ant-tabs-tabpane-hidden')
    );
  const usageRequests = () =>
    USAGE_API_METHODS.reduce((total, method) => total + api[method].calls.count(), 0);

  async function open(url: string): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await settle();
  }

  async function settle(): Promise<void> {
    // nz-tabs activates the selected tab in a microtask after change detection.
    for (let i = 0; i < 3; i++) {
      harness.detectChanges();
      await new Promise((resolve) => setTimeout(resolve));
    }
  }

  async function clickTab(index: number): Promise<void> {
    (element().querySelectorAll('.ant-tabs-tab-btn')[index] as HTMLElement).click();
    await settle();
  }

  beforeEach(async () => {
    api = jasmine.createSpyObj<UsageApiService>('UsageApiService', USAGE_API_METHODS);
    for (const method of USAGE_API_METHODS) {
      api[method].and.returnValue(of() as never);
    }
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideRouter([{ path: 'asset', component: HostPageComponent }]),
        { provide: UsageApiService, useValue: api },
        {
          provide: AdminAuthService,
          useValue: {
            isStaff: () => false,
            hasPermission: (code: string) => permissions().includes(code),
          },
        },
      ],
    }).compileComponents();
  });

  it('shows the content without tabs or usage for users without the usage permission', async () => {
    permissions.set([]);
    await open('/asset?tab=analytics');

    expect(tabTitles()).toEqual([]);
    expect(visibleDetails().length).toBe(1);
    expect(dashboard()).toBeNull();
    expect(usageRequests()).toBe(0);
  });

  it('opens on the Details tab and sends no usage requests until Analytics is opened', async () => {
    permissions.set(['portal_read_usage']);
    await open('/asset');

    expect(tabTitles()).toEqual(['USAGE.ASSET_TABS.DETAILS', 'USAGE.ASSET_TABS.ANALYTICS']);
    expect(visibleDetails().length).toBe(1);
    expect(dashboard()).toBeNull();
    expect(usageRequests()).toBe(0);

    await clickTab(1);

    expect(dashboard()).not.toBeNull();
    expect(usageRequests()).toBeGreaterThan(0);
    expect(TestBed.inject(Router).url).toBe('/asset?tab=analytics');
  });

  it('opens the Analytics tab from ?tab=analytics and drops the param on Details', async () => {
    permissions.set(['portal_read_usage']);
    await open('/asset?tab=analytics&quality=hq');

    expect(dashboard()).not.toBeNull();
    expect(visibleDetails().length).toBe(0);

    await clickTab(0);

    expect(visibleDetails().length).toBe(1);
    expect(TestBed.inject(Router).url).toBe('/asset?quality=hq');
  });

  it('treats an unknown tab value as the Details tab', async () => {
    permissions.set(['portal_read_usage']);
    await open('/asset?tab=bogus');

    expect(visibleDetails().length).toBe(1);
    expect(dashboard()).toBeNull();
    expect(usageRequests()).toBe(0);
  });
});
