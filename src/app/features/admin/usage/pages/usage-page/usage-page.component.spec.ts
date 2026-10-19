import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { UsageApiService } from '../../../../usage/services/usage-api.service';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { UsageService } from '../../services/usage.service';
import { UsagePageComponent } from './usage-page.component';

describe('UsagePageComponent', () => {
  let fixture: ComponentFixture<UsagePageComponent>;
  const isItqanAdmin = signal(false);
  const tabTitles = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.ant-tabs-tab')).map(
      (tab) => tab.textContent?.trim()
    );

  beforeEach(async () => {
    const api = jasmine.createSpyObj<UsageApiService>('UsageApiService', [
      'summary',
      'timeseries',
      'breakdown',
      'leaderboard',
      'reconciliation',
    ]);
    api.summary.and.returnValue(of());
    api.timeseries.and.returnValue(of());
    api.breakdown.and.returnValue(of());
    await TestBed.configureTestingModule({
      imports: [UsagePageComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: UsageApiService, useValue: api },
        { provide: AdminAuthService, useValue: { isItqanAdmin } },
        {
          provide: PublishersFilterService,
          useValue: { search: () => of({ results: [{ id: 3, name: 'Pub' }], count: 1 }) },
        },
        { provide: UsageService, useValue: { getBoardUrl: () => of({ board_url: null }) } },
      ],
    }).compileComponents();
  });

  it('publishers see the dashboard and the legacy board only', () => {
    isItqanAdmin.set(false);
    fixture = TestBed.createComponent(UsagePageComponent);
    fixture.detectChanges();

    expect(tabTitles()).toEqual(['USAGE.TABS.DASHBOARD', 'USAGE.TABS.LEGACY']);
    expect(fixture.componentInstance.scope()).toBe('publisher');
  });

  it('Itqan admins also get the publisher picker, leaderboard and unseen traffic', () => {
    isItqanAdmin.set(true);
    fixture = TestBed.createComponent(UsagePageComponent);
    fixture.detectChanges();

    expect(tabTitles()).toEqual([
      'USAGE.TABS.DASHBOARD',
      'USAGE.TABS.LEADERBOARD',
      'USAGE.TABS.UNSEEN',
      'USAGE.TABS.LEGACY',
    ]);
    expect(fixture.componentInstance.scope()).toBe('admin');
    expect(fixture.componentInstance.publishers().length).toBe(1);
  });
  it('a late board response for a previous publisher does not replace the current board', () => {
    const responses = [
      new Subject<{ board_url: string | null }>(),
      new Subject<{ board_url: string | null }>(),
    ];
    const getBoardUrl = jasmine.createSpy('getBoardUrl').and.returnValues(...responses);
    TestBed.overrideProvider(UsageService, { useValue: { getBoardUrl } });
    isItqanAdmin.set(true);
    fixture = TestBed.createComponent(UsagePageComponent);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.onTabChange(3, 3);
    page.onPublisherChange(5);
    responses[1].next({ board_url: 'https://board/5' });
    responses[0].next({ board_url: 'https://board/all' });

    const url = page.boardUrl() as unknown as { changingThisBreaksApplicationSecurity: string };
    expect(url.changingThisBreaksApplicationSecurity).toBe('https://board/5');
  });
});
