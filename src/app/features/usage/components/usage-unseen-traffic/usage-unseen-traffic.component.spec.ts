import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { UsageApiService } from '../../services/usage-api.service';
import { UsageUnseenTrafficComponent } from './usage-unseen-traffic.component';

describe('UsageUnseenTrafficComponent', () => {
  let fixture: ComponentFixture<UsageUnseenTrafficComponent>;
  let api: jasmine.SpyObj<UsageApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<UsageApiService>('UsageApiService', ['reconciliation']);
    api.reconciliation.and.returnValue(
      of({
        total: { reads: 13, edge_requests: 7, unseen: 8 },
        assets: [{ key: '5', label: 'Asset A', reads: 11, edge_requests: 7, unseen: 6 }],
        days: [{ t: '2026-10-01', reads: 13, edge_requests: 7, unseen: 8 }],
        data_updated_at: null,
      })
    );
    await TestBed.configureTestingModule({
      imports: [UsageUnseenTrafficComponent, TranslateModule.forRoot()],
      providers: [{ provide: UsageApiService, useValue: api }],
    }).compileComponents();
    TestBed.inject(TranslateService).use('en');
    fixture = TestBed.createComponent(UsageUnseenTrafficComponent);
    fixture.componentRef.setInput('filters', {
      start_date: '2026-10-01',
      end_date: '2026-10-07',
      publisher_id: 3,
    });
  });

  it('shows totals, the daily chart and the assets with the most unseen reads', () => {
    fixture.detectChanges();

    expect(api.reconciliation).toHaveBeenCalledWith(jasmine.objectContaining({ publisher_id: 3 }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('USAGE.UNSEEN.READS');
    expect(text).toContain('Asset A');
    expect(fixture.componentInstance.chartOptions()).not.toBeNull();
  });
});
