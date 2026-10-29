import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { UsageApiService } from '../../services/usage-api.service';
import { RecitationCatalogComponent } from './recitation-catalog.component';

describe('RecitationCatalogComponent', () => {
  let fixture: ComponentFixture<RecitationCatalogComponent>;
  let api: jasmine.SpyObj<UsageApiService>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    api = jasmine.createSpyObj<UsageApiService>('UsageApiService', [
      'breakdown',
      'searchTerms',
      'recitationCoverage',
    ]);
    api.breakdown.and.returnValue(
      of({
        metric: 'plays',
        by: 'asset',
        items: [{ key: '9', label: 'Recitation A', value: 30, previous: 10 }],
        other: 0,
        total: 30,
        data_updated_at: null,
      })
    );
    api.searchTerms.and.returnValue(
      of({
        items: [
          {
            term: 'العفاسي',
            searchers: 5,
            searches: 8,
            zero_results: 2,
            latest_results: 1,
            match: { type: 'reciter', id: 3, label: 'Mishary Alafasy' },
          },
        ],
      })
    );
    api.recitationCoverage.and.returnValue(
      of({
        items: [
          {
            asset_id: 9,
            name: 'Recitation B',
            surahs: 100,
            missing: [1, 2],
            missing_by_demand: [2, 1],
            timed_share: null,
          },
        ],
        demand_days: 90,
        data_updated_at: null,
      })
    );

    await TestBed.configureTestingModule({
      imports: [RecitationCatalogComponent, TranslateModule.forRoot()],
      providers: [provideNoopAnimations(), { provide: UsageApiService, useValue: api }],
    }).compileComponents();

    TestBed.inject(TranslateService).use('en');
    fixture = TestBed.createComponent(RecitationCatalogComponent);
    fixture.componentRef.setInput('scope', 'admin');
    fixture.componentRef.setInput('filters', {
      start_date: '2026-09-01',
      end_date: '2026-10-18',
      reciter_id: 3,
      publisher_id: 2,
    });
    fixture.detectChanges();
  });

  it('ranks the last 7 days of recitations with their change', () => {
    const [scope, filters, options] = api.breakdown.calls.mostRecent().args;
    expect(scope).toBe('admin');
    expect(filters.category).toBe('recitation');
    expect(filters.start_date).not.toBe('2026-09-01');
    expect(options).toEqual(
      jasmine.objectContaining({ by: 'asset', compare: true, order: 'value' })
    );
    expect(text()).toContain('Recitation A');
    expect(text()).toContain('+200%');
  });

  it('switches to rising recitations', () => {
    fixture.componentInstance.setOrder('growth');

    expect(api.breakdown.calls.mostRecent().args[2].order).toBe('growth');
  });

  it('lists search terms with their match and switches to searches without results', () => {
    expect(text()).toContain('العفاسي');
    expect(text()).toContain('Mishary Alafasy');

    fixture.componentInstance.setSearchView('zero');

    expect(api.searchTerms.calls.mostRecent().args[2]).toBeTrue();
  });

  it('lists incomplete recitations of the filtered reciter and publisher', () => {
    expect(api.recitationCoverage).toHaveBeenCalledWith('admin', {
      reciter_id: 3,
      riwayah_id: undefined,
      publisher_id: 2,
      incomplete_only: true,
      limit: 50,
    });
    expect(text()).toContain('Recitation B');
    expect(text()).toContain('2. Al-Baqarah, 1. Al-Fatihah');
  });
});
