import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { UsageApiService } from './usage-api.service';

describe('UsageApiService', () => {
  let service: UsageApiService;
  let http: HttpTestingController;
  const range = { start_date: '2026-10-01', end_date: '2026-10-07' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsageApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('summary calls the endpoint of each scope with the filters', () => {
    service.summary('publisher', { ...range, category: 'tafsir', channel: null }).subscribe();
    service.summary('admin', { ...range, publisher_id: 4 }).subscribe();
    service.summary('developer', range).subscribe();

    const publisher = http.expectOne(
      (r) => r.url === `${environment.ADMIN_API_BASE_URL}/usage/summary/`
    );
    expect(publisher.request.params.get('category')).toBe('tafsir');
    expect(publisher.request.params.has('channel')).toBeFalse();
    const admin = http.expectOne(
      (r) => r.url === `${environment.ADMIN_API_BASE_URL}/admin/usage/summary/`
    );
    expect(admin.request.params.get('publisher_id')).toBe('4');
    const developer = http.expectOne(
      (r) => r.url === `${environment.API_BASE_URL}/developers/usage/summary/`
    );
    [publisher, admin, developer].forEach((req) => req.flush({}));
  });

  it('timeseries sends metric, granularity, split and compare', () => {
    service
      .timeseries('publisher', range, {
        metric: 'plays',
        granularity: 'week',
        split_by: 'country',
        top: 5,
        compare: true,
      })
      .subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/usage/timeseries/'));
    expect(req.request.params.get('metric')).toBe('plays');
    expect(req.request.params.get('granularity')).toBe('week');
    expect(req.request.params.get('split_by')).toBe('country');
    expect(req.request.params.get('top')).toBe('5');
    expect(req.request.params.get('compare')).toBe('previous_period');
    req.flush({});
  });

  it('breakdown sends by, limit and tz', () => {
    service
      .breakdown('developer', range, { metric: 'api_calls', by: 'hour_of_week', tz: 'Asia/Riyadh' })
      .subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/developers/usage/breakdown/'));
    expect(req.request.params.get('by')).toBe('hour_of_week');
    expect(req.request.params.get('tz')).toBe('Asia/Riyadh');
    req.flush({});
  });

  it('leaderboard and reconciliation call the admin endpoints', () => {
    service.leaderboard(range, { metric: 'plays', by: 'publisher', limit: 20 }).subscribe();
    service.reconciliation(range).subscribe();

    const leaderboard = http.expectOne((r) => r.url.endsWith('/admin/usage/leaderboard/'));
    expect(leaderboard.request.params.get('by')).toBe('publisher');
    const reconciliation = http.expectOne((r) => r.url.endsWith('/admin/usage/reconciliation/'));
    expect(reconciliation.request.params.get('limit')).toBe('20');
    [leaderboard, reconciliation].forEach((req) => req.flush({}));
  });

  it('exportCsv downloads a blob', () => {
    let size = 0;
    service.exportCsv('publisher', range).subscribe((blob) => (size = blob.size));

    const req = http.expectOne((r) => r.url.endsWith('/usage/export/'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['period\n']));
    expect(size).toBe(7);
  });

  it('publicCounts returns null when the counts are turned off (404)', () => {
    let result: unknown = 'unset';
    service.publicCounts(9).subscribe((value) => (result = value));

    http
      .expectOne(`${environment.API_BASE_URL}/assets/9/usage-counts/`)
      .flush(
        { error_name: 'usage_counts_disabled', message: 'x' },
        { status: 404, statusText: 'Not Found' }
      );
    expect(result).toBeNull();
  });
});
