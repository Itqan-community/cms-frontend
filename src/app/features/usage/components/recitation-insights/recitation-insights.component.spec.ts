import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { UsageSummary } from '../../models/usage.models';
import { UsageApiService } from '../../services/usage-api.service';
import { RecitationInsightsComponent } from './recitation-insights.component';

const metric = (value: number) => ({ value, previous: 0, change: null });

describe('RecitationInsightsComponent', () => {
  let fixture: ComponentFixture<RecitationInsightsComponent>;
  let api: jasmine.SpyObj<UsageApiService>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    api = jasmine.createSpyObj<UsageApiService>('UsageApiService', [
      'listeners',
      'cohorts',
      'firstSeen',
      'recitationCoverage',
    ]);
    api.listeners.and.returnValue(
      of({
        granularity: 'day',
        points: [{ t: '2026-10-12', new: 2, returning: 1, cumulative: 5 }],
        clamped_start: '2026-10-01',
        data_updated_at: null,
      })
    );
    api.cohorts.and.returnValue(
      of({
        cohorts: [{ week: '2026-10-05', size: 4, retention: [1, 0.5] }],
        clamped_start: null,
        data_updated_at: null,
      })
    );
    api.firstSeen.and.callFake((_scope, _filters, by) =>
      of({
        by,
        items: [
          {
            key: by === 'country' ? 'EG' : '7',
            label: by === 'app' ? 'Quran App' : null,
            first_seen: '2026-10-15',
            new: true,
            plays: 12,
          },
        ],
        clamped_start: null,
        data_updated_at: null,
      })
    );
    api.recitationCoverage.and.returnValue(
      of({
        items: [
          {
            asset_id: 9,
            name: 'Recitation A',
            surahs: 112,
            missing: [113, 114],
            missing_by_demand: [114, 113],
            timed_share: 0.5,
          },
        ],
        demand_days: 90,
        data_updated_at: null,
      })
    );

    await TestBed.configureTestingModule({
      imports: [RecitationInsightsComponent, TranslateModule.forRoot()],
      providers: [{ provide: UsageApiService, useValue: api }],
    }).compileComponents();

    TestBed.inject(TranslateService).use('en');
    fixture = TestBed.createComponent(RecitationInsightsComponent);
    fixture.componentRef.setInput('scope', 'publisher');
  });

  const render = (filters: Record<string, unknown>, summary: UsageSummary | null = null) => {
    fixture.componentRef.setInput('filters', {
      start_date: '2026-10-01',
      end_date: '2026-10-18',
      ...filters,
    });
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();
  };

  it('loads listener growth, cohorts and the countries and apps reached', () => {
    render({});

    expect(api.listeners.calls.mostRecent().args[2]).toBe('day');
    expect(api.cohorts).toHaveBeenCalled();
    expect(api.firstSeen.calls.allArgs().map((args) => args[2])).toEqual(['country', 'app']);
    expect(text()).toContain('USAGE.RECITATION.CLAMPED');
    expect(text()).toContain('Quran App');
    expect(text()).toContain('50%');
    expect(api.recitationCoverage).not.toHaveBeenCalled();
  });

  it('skips cohorts for ranges longer than 26 weeks', () => {
    render({ start_date: '2026-01-01' });

    expect(api.cohorts).not.toHaveBeenCalled();
    expect(text()).toContain('USAGE.RECITATION.COHORTS_RANGE');
  });

  it('shows the surah coverage of the asset', () => {
    render({ asset_id: 9 });

    expect(api.recitationCoverage).toHaveBeenCalledWith('publisher', {
      asset_id: 9,
      incomplete_only: false,
      limit: 1,
    });
    expect(text()).toContain('USAGE.RECITATION.COVERAGE');
    expect(fixture.componentInstance.coverage()?.missing_by_demand).toEqual([114, 113]);
  });

  it('draws the gallery funnel from the summary', () => {
    render({}, {
      metrics: { views: metric(40), downloads: metric(10), plays: metric(80) },
    } as unknown as UsageSummary);

    expect(fixture.componentInstance.funnel().map((step) => step.width)).toEqual([50, 13, 100]);
  });

  it('shows an error when a report fails', () => {
    api.cohorts.and.returnValue(throwError(() => new Error('boom')));
    render({});

    expect(text()).toContain('USAGE.LOAD_ERROR');
  });
});
