import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { UsageApiService } from '../../../../usage/services/usage-api.service';
import { PublishersService } from '../../../publishers/services/publishers.service';
import { PublishersFilterService } from '../../../text-assets/services/publishers-filter.service';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { UsagePageComponent } from './usage-page.component';

describe('UsagePageComponent', () => {
  let fixture: ComponentFixture<UsagePageComponent>;
  const isStaff = signal(false);
  const tabTitles = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.ant-tabs-tab')).map(
      (tab) => tab.textContent?.trim()
    );

  beforeEach(async () => {
    const methods = [
      'summary',
      'timeseries',
      'breakdown',
      'leaderboard',
      'reconciliation',
      'listeners',
      'cohorts',
      'firstSeen',
      'searchTerms',
      'recitationCoverage',
      'cliVersions',
      'accessRequests',
    ] as const;
    const api = jasmine.createSpyObj<UsageApiService>('UsageApiService', [...methods]);
    for (const method of methods) {
      api[method].and.returnValue(of());
    }
    await TestBed.configureTestingModule({
      imports: [UsagePageComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: UsageApiService, useValue: api },
        { provide: AdminAuthService, useValue: { isStaff } },
        {
          provide: PublishersService,
          useValue: { getDetail: (id: number) => of({ id, name: 'Linked' }) },
        },
        {
          provide: PublishersFilterService,
          useValue: { search: () => of({ results: [{ id: 3, name: 'Pub' }], count: 1 }) },
        },
      ],
    }).compileComponents();
  });

  it('publishers see the dashboard, recitations and text assets', () => {
    isStaff.set(false);
    fixture = TestBed.createComponent(UsagePageComponent);
    fixture.detectChanges();

    expect(tabTitles()).toEqual([
      'USAGE.TABS.DASHBOARD',
      'USAGE.TABS.RECITATIONS',
      'USAGE.TABS.TEXT_ASSETS',
    ]);
    expect(fixture.componentInstance.scope()).toBe('publisher');
  });

  it('Itqan admins also get the publisher picker, leaderboard and unseen traffic', () => {
    isStaff.set(true);
    fixture = TestBed.createComponent(UsagePageComponent);
    fixture.detectChanges();

    expect(tabTitles()).toEqual([
      'USAGE.TABS.DASHBOARD',
      'USAGE.TABS.RECITATIONS',
      'USAGE.TABS.TEXT_ASSETS',
      'USAGE.TABS.LEADERBOARD',
      'USAGE.TABS.UNSEEN',
    ]);
    expect(fixture.componentInstance.scope()).toBe('admin');
    expect(fixture.componentInstance.publishers().length).toBe(1);
  });

  const open = async (url: string) => {
    await TestBed.inject(Router).navigateByUrl(url);
    fixture = TestBed.createComponent(UsagePageComponent);
    fixture.detectChanges();
  };

  it('opens the tab and publisher named in the URL', async () => {
    isStaff.set(true);
    await open('/?tab=unseen&publisher=3');

    expect(fixture.componentInstance.tab()).toBe('unseen');
    expect(fixture.componentInstance.tabIndex()).toBe(4);
    expect(fixture.componentInstance.selectedPublisherId()).toBe(3);
  });

  it('falls back to the Dashboard for unknown tabs and, for publishers, staff-only ones', async () => {
    isStaff.set(false);
    await open('/?tab=leaderboard&publisher=3');
    expect(fixture.componentInstance.tab()).toBe('dashboard');
    expect(fixture.componentInstance.selectedPublisherId()).toBeNull();

    await open('/?tab=nope');
    expect(fixture.componentInstance.tab()).toBe('dashboard');

    await open('/?tab=text');
    expect(fixture.componentInstance.tab()).toBe('text');
  });

  it('writes the opened tab to the URL, keeping the range and dropping the previous view', async () => {
    isStaff.set(false);
    await open('/?range=custom&start=2026-09-01&end=2026-09-30&metric=downloads&split=country');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture.componentInstance.onTabChange(1);

    const extras = navigate.calls.mostRecent().args[1];
    expect(extras?.replaceUrl).toBeTrue();
    expect(extras?.queryParamsHandling).toBe('merge');
    expect(extras?.queryParams).toEqual(
      jasmine.objectContaining({ tab: 'recitations', metric: null, split: null })
    );
    expect(Object.keys(extras?.queryParams ?? {})).not.toContain('range');

    navigate.calls.reset();
    fixture.componentInstance.onTabChange(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("names a linked publisher that is not on the picker's first page", async () => {
    isStaff.set(true);
    await open('/?publisher=9');

    expect(fixture.componentInstance.publishers()).toEqual([
      { id: 9, name: 'Linked' },
      { id: 3, name: 'Pub' },
    ]);

    await open('/?publisher=3');
    expect(fixture.componentInstance.publishers()).toEqual([{ id: 3, name: 'Pub' }]);
  });

  it('writes the picked publisher to the URL', async () => {
    isStaff.set(true);
    await open('/');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture.componentInstance.onPublisherChange(3);

    expect(navigate.calls.mostRecent().args[1]?.queryParams).toEqual({ publisher: 3 });
  });
});
