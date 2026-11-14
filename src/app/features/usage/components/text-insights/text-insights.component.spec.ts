import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { UsageApiService } from '../../services/usage-api.service';
import { TextInsightsComponent } from './text-insights.component';

describe('TextInsightsComponent', () => {
  let fixture: ComponentFixture<TextInsightsComponent>;
  let api: jasmine.SpyObj<UsageApiService>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    api = jasmine.createSpyObj<UsageApiService>('UsageApiService', [
      'cliVersions',
      'accessRequests',
    ]);
    api.cliVersions.and.returnValue(
      of({
        items: [
          {
            asset_id: 4,
            asset: 'Tafsir A',
            version_id: 9,
            version: '1.1.0',
            language: 'ar',
            installs: 12,
            updates: 5,
          },
        ],
        data_updated_at: null,
      })
    );
    api.accessRequests.and.returnValue(
      of({
        total: { value: 3, previous: 1, change: 2 },
        statuses: { pending: 1, approved: 2, rejected: 0 },
        granularity: 'week',
        partial_buckets: [],
        points: [
          { t: '2026-10-05', value: 1 },
          { t: '2026-10-12', value: 2 },
        ],
        assets: [{ key: '4', label: 'Tafsir A', value: 3 }],
      })
    );

    await TestBed.configureTestingModule({
      imports: [TextInsightsComponent, TranslateModule.forRoot()],
      providers: [{ provide: UsageApiService, useValue: api }],
    }).compileComponents();

    TestBed.inject(TranslateService).use('en');
    fixture = TestBed.createComponent(TextInsightsComponent);
    fixture.componentRef.setInput('scope', 'publisher');
  });

  const render = (filters: Record<string, unknown> = {}) => {
    fixture.componentRef.setInput('filters', {
      start_date: '2026-10-01',
      end_date: '2026-10-18',
      ...filters,
    });
    fixture.detectChanges();
  };

  it('lists installs and updates per version and the access requests of the range', () => {
    fixture.componentRef.setInput('granularity', 'week');
    render();

    expect(api.accessRequests.calls.mostRecent().args[2]).toBe('week');
    expect(text()).toContain('1.1.0');
    expect(text()).toContain('Tafsir A');
    expect(text()).toContain('USAGE.TEXT.REQUESTS_ASSETS');
    expect(fixture.componentInstance.requestTotals()?.change?.direction).toBe('up');
    expect(fixture.componentInstance.versionRows()[0].language).toBe('Arabic');
  });

  it('hides the asset column and top assets on one asset', () => {
    render({ asset_id: 4 });

    expect(text()).not.toContain('USAGE.TEXT.ASSET');
    expect(text()).not.toContain('USAGE.TEXT.REQUESTS_ASSETS');
  });

  it('reloads only the access requests when the bucket size changes', () => {
    fixture.componentRef.setInput('granularity', 'week');
    render();
    const versions = api.cliVersions.calls.count();

    fixture.componentRef.setInput('granularity', 'month');
    fixture.detectChanges();

    expect(api.accessRequests.calls.mostRecent().args[2]).toBe('month');
    expect(api.cliVersions.calls.count()).toBe(versions);
  });

  it("shows the backend's error message when a report fails", () => {
    api.cliVersions.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { error_name: 'asset_not_found', message: 'Asset does not exist.' },
          })
      )
    );
    render();

    expect(text()).toContain('Asset does not exist.');
  });
});
