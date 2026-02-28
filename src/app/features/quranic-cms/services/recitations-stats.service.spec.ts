import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NzMessageService } from 'ng-zorro-antd/message';
import { environment } from '../../../../environments/environment';
import { RecitationsStatsService } from './recitations-stats.service';

describe('RecitationsStatsService (Quranic CMS)', () => {
  let service: RecitationsStatsService;
  let httpMock: HttpTestingController;
  let messageServiceSpy: jasmine.SpyObj<NzMessageService>;

  beforeEach(() => {
    messageServiceSpy = jasmine.createSpyObj('NzMessageService', ['error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: NzMessageService, useValue: messageServiceSpy }],
    });

    service = TestBed.inject(RecitationsStatsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should return real stats when API succeeds', () => {
    let resultStats: any;

    service.getStats().subscribe((stats) => {
      resultStats = stats;
    });

    const base = environment.API_BASE_URL;

    const req1 = httpMock.expectOne((req) => req.url.includes('/riwayas/'));
    const req2 = httpMock.expectOne((req) => req.url.includes('/reciters/'));
    const req3 = httpMock.expectOne((req) => req.url.includes('/recitations/'));

    expect(req1.request.method).toBe('GET');
    expect(req2.request.method).toBe('GET');
    expect(req3.request.method).toBe('GET');

    req1.flush({ count: 10, results: [] });
    req2.flush({ count: 5, results: [] });
    req3.flush({ count: 20, results: [] });

    expect(resultStats).toBeDefined();
    expect(resultStats.riwayas).toBe(10);
    expect(resultStats.reciters).toBe(5);
    expect(resultStats.recitations).toBe(20);
    expect(resultStats.isMock).toBeFalsy();
    expect(messageServiceSpy.error).not.toHaveBeenCalled();
  });

  it('should fall back to MOCK stats and show toaster on error', () => {
    let resultStats: any;

    service.getStats().subscribe((stats) => {
      resultStats = stats;
    });

    const base = environment.API_BASE_URL;

    // We catch all 3 parallel requests
    const req1 = httpMock.expectOne((req) => req.url.includes('/riwayas/'));
    const req2 = httpMock.expectOne((req) => req.url.includes('/reciters/'));
    const req3 = httpMock.expectOne((req) => req.url.includes('/recitations/'));

    // Failing the first request will cause forkJoin to cancel the other two.
    req1.flush(null, { status: 404, statusText: 'Not Found' });

    // For cancelled requests, we don't need to flush them, but we should assert they are cancelled.
    expect(req2.cancelled).toBeTrue();
    expect(req3.cancelled).toBeTrue();

    expect(resultStats).toBeDefined();
    expect(resultStats.isMock).toBeTrue();
    expect(resultStats.riwayas).toBeGreaterThan(0);
    expect(messageServiceSpy.error).toHaveBeenCalled();
  });
});

