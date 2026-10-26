import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, of, throwError } from 'rxjs';
import {
  UsageBreakdown,
  UsageCohorts,
  UsageFirstSeen,
  UsageListeners,
  UsageRecitationCoverage,
  UsageSearchTerms,
  UsageSummary,
  UsageTimeseries,
} from '../../models/usage.models';
import { UsageApiService } from '../../services/usage-api.service';
import { UsageDashboardComponent } from './usage-dashboard.component';

const metric = (value: number, previous = 0, change: number | null = null) => ({
  value,
  previous,
  change,
});

const SUMMARY: UsageSummary = {
  period: { start_date: '2026-10-12', end_date: '2026-10-18' },
  previous_period: { start_date: '2026-10-05', end_date: '2026-10-11' },
  metrics: {
    plays: metric(1500, 1000, 0.5),
    downloads: metric(4),
    installs: metric(2),
    api_calls: metric(9),
    requests: metric(40),
    bytes: metric(10),
    unique_listeners: metric(80),
    unique_downloaders: metric(3),
    unique_end_users: metric(0),
    views: metric(1),
    listening_seconds: metric(9000),
  },
  integrating_apps: metric(3),
  unidentified_apps: true,
  latest_version_share: null,
  uniques_basis: 'events',
  definitions: { plays: 'A play is…' },
  disclaimers: [{ code: 'lower_bound', text: 'Counts are lower bounds.' }],
  data_updated_at: '2026-10-18T10:00:00Z',
};
const TIMESERIES: UsageTimeseries = {
  metric: 'plays',
  granularity: 'day',
  series: [{ key: 'all', label: null, points: [{ t: '2026-10-12', value: 3 }] }],
  previous: null,
  data_updated_at: null,
};
const BREAKDOWN: UsageBreakdown = {
  metric: 'plays',
  by: 'country',
  items: [{ key: 'SA', label: null, value: 5, previous: null }],
  other: 0,
  total: 5,
  data_updated_at: null,
};

const LISTENERS: UsageListeners = {
  granularity: 'day',
  points: [{ t: '2026-10-12', new: 2, returning: 1, cumulative: 5 }],
  clamped_start: null,
  data_updated_at: null,
};
const COHORTS: UsageCohorts = { cohorts: [], clamped_start: null, data_updated_at: null };
const FIRST_SEEN: UsageFirstSeen = {
  by: 'country',
  items: [],
  clamped_start: null,
  data_updated_at: null,
};
const SEARCH_TERMS: UsageSearchTerms = { items: [] };
const COVERAGE: UsageRecitationCoverage = { items: [], demand_days: 90, data_updated_at: null };

describe('UsageDashboardComponent', () => {
  let fixture: ComponentFixture<UsageDashboardComponent>;
  let api: jasmine.SpyObj<UsageApiService>;
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let router: jasmine.SpyObj<Router>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    api = jasmine.createSpyObj<UsageApiService>('UsageApiService', [
      'summary',
      'timeseries',
      'breakdown',
      'exportCsv',
      'listeners',
      'cohorts',
      'firstSeen',
      'searchTerms',
      'recitationCoverage',
    ]);
    api.listeners.and.returnValue(of(LISTENERS));
    api.cohorts.and.returnValue(of(COHORTS));
    api.firstSeen.and.returnValue(of(FIRST_SEEN));
    api.searchTerms.and.returnValue(of(SEARCH_TERMS));
    api.recitationCoverage.and.returnValue(of(COVERAGE));
    api.summary.and.returnValue(of(SUMMARY));
    api.timeseries.and.returnValue(of(TIMESERIES));
    api.breakdown.and.returnValue(of(BREAKDOWN));
    api.exportCsv.and.returnValue(of(new Blob(['period\n'])));
    queryParams = new BehaviorSubject(convertToParamMap({ range: '7d', channel: 'cli' }));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [UsageDashboardComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        { provide: UsageApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams.asObservable() } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).use('en');
    fixture = TestBed.createComponent(UsageDashboardComponent);
    fixture.componentRef.setInput('scope', 'publisher');
  });

  it('loads every report with the filters from the URL', () => {
    fixture.detectChanges();

    const [scope, filters] = api.summary.calls.mostRecent().args;
    expect(scope).toBe('publisher');
    expect(filters.channel).toBe('cli');
    expect(api.timeseries.calls.mostRecent().args[2].metric).toBe('plays');
    expect(api.breakdown.calls.count()).toBe(5);
  });

  it('renders headline values with their change, the disclaimers and the update time', () => {
    fixture.detectChanges();

    expect(text()).toContain('1.5K');
    expect(text()).toContain('+50%');
    expect(text()).toContain('Counts are lower bounds.');
    expect(text()).toContain('USAGE.LAST_UPDATED');
  });

  it('writes filter changes to the URL, which reloads the reports', () => {
    fixture.detectChanges();

    fixture.componentInstance.setMetric('downloads');

    const extras = router.navigate.calls.mostRecent().args[1];
    expect(extras?.queryParams?.['metric']).toBe('downloads');
    queryParams.next(convertToParamMap({ range: '7d', metric: 'downloads' }));
    expect(api.timeseries.calls.mostRecent().args[2].metric).toBe('downloads');
  });

  it('keeps state locally when not synced to the URL', () => {
    fixture.componentRef.setInput('syncUrl', false);
    fixture.componentRef.setInput('assetId', 7);
    fixture.componentRef.setInput('category', 'tafsir');
    fixture.detectChanges();

    expect(api.summary.calls.mostRecent().args[1].asset_id).toBe(7);
    expect(api.timeseries.calls.mostRecent().args[2].metric).toBe('downloads');

    fixture.componentInstance.setPreset('90d');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(api.summary.calls.count()).toBe(2);
  });

  it('keeps every app in the developer app filter after one is selected', () => {
    const item = (key: string, label: string) => ({ key, label, value: 5, previous: null });
    api.breakdown.and.callFake((_scope, filters, params) =>
      of({
        ...BREAKDOWN,
        by: params.by,
        items:
          params.by !== 'app'
            ? []
            : filters.app
              ? [item(String(filters.app), `App ${filters.app}`)]
              : [item('1', 'App 1'), item('2', 'App 2')],
      })
    );
    fixture.componentRef.setInput('scope', 'developer');
    fixture.componentRef.setInput('syncUrl', false);
    fixture.detectChanges();

    fixture.componentInstance.setFilter('app', 1);

    expect(fixture.componentInstance.appOptions().map((app) => app.name)).toEqual([
      'App 1',
      'App 2',
    ]);
  });

  it('exports the CSV for the current filters', () => {
    fixture.detectChanges();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(URL, 'revokeObjectURL');

    fixture.componentInstance.exportCsv();

    expect(api.exportCsv).toHaveBeenCalledWith(
      'publisher',
      jasmine.objectContaining({ channel: 'cli' })
    );
  });

  it('shows an error state with retry when the summary fails', () => {
    api.summary.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();

    expect(text()).toContain('USAGE.LOAD_ERROR');
  });

  it('shows the recitation reports, filters and listening hours for a fixed recitation category', () => {
    fixture.componentRef.setInput('category', 'recitation');
    fixture.componentRef.setInput('syncUrl', false);
    fixture.detectChanges();

    expect(api.summary.calls.mostRecent().args[1].category).toBe('recitation');
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-recitation-insights')).not.toBeNull();
    expect(element.querySelector('app-recitation-catalog')).not.toBeNull();
    // 9000 seconds of listening are shown as 2.5 hours.
    expect(text()).toContain('2.5');
    const dimensions = api.breakdown.calls.allArgs().map(([, , options]) => options.by);
    expect(dimensions).toContain('reciter');
    expect(dimensions).toContain('riwayah');
  });

  it('clears the reciter and riwayah filters when the category changes', () => {
    fixture.componentRef.setInput('syncUrl', false);
    fixture.detectChanges();
    fixture.componentInstance.setFilter('category', 'recitation');
    fixture.componentInstance.setFilter('reciter_id', 4);

    fixture.componentInstance.setFilter('category', 'tafsir');

    const filters = api.summary.calls.mostRecent().args[1];
    expect(filters.category).toBe('tafsir');
    expect(filters.reciter_id).toBeNull();
  });

  it('does not show the recitation reports on other dashboards', () => {
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-recitation-insights')
    ).toBeNull();
    expect(api.listeners).not.toHaveBeenCalled();
  });

  it('compares with the same dates a year earlier in a second request', () => {
    queryParams.next(
      convertToParamMap({
        range: 'custom',
        start: '2026-10-01',
        end: '2026-10-07',
        compare: 'year',
      })
    );
    fixture.detectChanges();

    const [current, year] = api.timeseries.calls.allArgs().slice(-2);
    expect(current[2].compare).toBeFalse();
    expect(year[1]).toEqual(
      jasmine.objectContaining({ start_date: '2025-10-01', end_date: '2025-10-07' })
    );
  });

  it('follows a shared range and reports its own range changes', () => {
    fixture.componentRef.setInput('syncUrl', false);
    fixture.componentRef.setInput('sharedRange', {
      preset: '90d',
      start_date: '2026-07-25',
      end_date: '2026-10-22',
    });
    const emitted: unknown[] = [];
    fixture.componentInstance.rangeChange.subscribe((range) => emitted.push(range));
    fixture.detectChanges();
    expect(api.summary.calls.mostRecent().args[1].start_date).toBe('2026-07-25');

    fixture.componentRef.setInput('sharedRange', {
      preset: 'custom',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
    });
    fixture.detectChanges();
    expect(api.summary.calls.mostRecent().args[1].start_date).toBe('2026-09-01');
    expect(emitted).toEqual([]);

    fixture.componentInstance.setPreset('7d');
    expect(emitted).toEqual([jasmine.objectContaining({ preset: '7d' })]);
  });
});
