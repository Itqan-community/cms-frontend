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

  it('should return real stats when API succeeds', (done) => {
    service.getStats().subscribe((stats) => {
      expect(stats.riwayas).toBe(10);
      expect(stats.reciters).toBe(5);
      expect(stats.recitations).toBe(20);
      expect(stats.isMock).toBeFalsy();
      expect(messageServiceSpy.error).not.toHaveBeenCalled();
      done();
    });

    const base = environment.API_BASE_URL;

    httpMock.expectOne(`${base}/riwayas/?page_size=1`).flush({ count: 10, results: [] });
    httpMock.expectOne(`${base}/reciters/?page_size=1`).flush({ count: 5, results: [] });
    httpMock.expectOne(`${base}/recitations/?page_size=1`).flush({ count: 20, results: [] });
  });

  it('should fall back to MOCK stats and show toaster on error', (done) => {
    service.getStats().subscribe((stats) => {
      expect(stats.isMock).toBeTrue();
      expect(stats.riwayas).toBeGreaterThan(0);
      expect(messageServiceSpy.error).toHaveBeenCalled();
      done();
    });

    const base = environment.API_BASE_URL;

    httpMock.expectOne(`${base}/riwayas/?page_size=1`).flush(null, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(`${base}/reciters/?page_size=1`).flush(null, { status: 404, statusText: 'Not Found' });
    httpMock
      .expectOne(`${base}/recitations/?page_size=1`)
      .flush(null, { status: 404, statusText: 'Not Found' });
  });
});

