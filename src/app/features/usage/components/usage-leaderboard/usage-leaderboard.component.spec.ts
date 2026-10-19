import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { UsageApiService } from '../../services/usage-api.service';
import { formatCompact } from '../../utils/usage-filters.util';
import { UsageLeaderboardComponent } from './usage-leaderboard.component';

describe('UsageLeaderboardComponent', () => {
  let fixture: ComponentFixture<UsageLeaderboardComponent>;
  let api: jasmine.SpyObj<UsageApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<UsageApiService>('UsageApiService', ['leaderboard']);
    api.leaderboard.and.returnValue(
      of({
        metric: 'plays',
        by: 'publisher',
        items: [
          { key: '2', label: 'Pub B', value: 900, previous: 300 },
          { key: '1', label: 'Pub A', value: 50, previous: 0 },
        ],
        other: 0,
        total: 950,
        data_updated_at: null,
      })
    );
    await TestBed.configureTestingModule({
      imports: [UsageLeaderboardComponent, TranslateModule.forRoot()],
      providers: [provideNoopAnimations(), { provide: UsageApiService, useValue: api }],
    }).compileComponents();
    TestBed.inject(TranslateService).use('en');
    fixture = TestBed.createComponent(UsageLeaderboardComponent);
    fixture.componentRef.setInput('filters', { start_date: '2026-10-01', end_date: '2026-10-07' });
  });

  it('ranks publishers with their change against the previous period', () => {
    fixture.detectChanges();

    expect(api.leaderboard.calls.mostRecent().args[1]).toEqual({
      metric: 'plays',
      by: 'publisher',
      limit: 50,
    });
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Pub B');
    expect(rows[0].textContent).toContain('+200%');
  });

  it('relabels the options and rows when the language changes', () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { USAGE: { SPLIT_BY: { publisher: 'Publisher' } } });
    translate.setTranslation('ar', { USAGE: { SPLIT_BY: { publisher: 'الناشر' } } });
    fixture.detectChanges();
    expect(fixture.componentInstance.byOptions()[0].label).toBe('Publisher');

    translate.use('ar');
    fixture.detectChanges();

    expect(fixture.componentInstance.byOptions()[0].label).toBe('الناشر');
    expect(fixture.componentInstance.rows()[0].value).toBe(formatCompact(900, 'ar'));
  });

  it('reloads when switching to assets', () => {
    fixture.detectChanges();

    fixture.componentInstance.setBy('asset');

    expect(api.leaderboard.calls.mostRecent().args[1].by).toBe('asset');
  });
});
