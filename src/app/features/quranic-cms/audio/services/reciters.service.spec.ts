import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NzMessageService } from 'ng-zorro-antd/message';
import { environment } from '../../../../../environments/environment';
import { RecitersService } from './reciters.service';

describe('RecitersService', () => {
  let service: RecitersService;
  let httpMock: HttpTestingController;
  let messageServiceSpy: jasmine.SpyObj<NzMessageService>;

  beforeEach(() => {
    messageServiceSpy = jasmine.createSpyObj('NzMessageService', ['error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: NzMessageService, useValue: messageServiceSpy }],
    });

    service = TestBed.inject(RecitersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getReciters', () => {
    it('should fetch reciters with default params', () => {
      const mockResponse = {
        count: 2,
        next: null,
        previous: null,
        results: [
          { id: 1, name: 'القارئ الأول', bio: '', recitations_count: 5 },
          { id: 2, name: 'القارئ الثاني', bio: '', recitations_count: 3 },
        ],
      };

      service.getReciters().subscribe((response) => {
        expect(response.count).toBe(2);
        expect(response.results.length).toBe(2);
      });

      const req = httpMock.expectOne((r) => r.url === `${environment.API_BASE_URL}/reciters/`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('page_size')).toBe('12');
      expect(req.request.params.has('search')).toBeFalse();
      req.flush(mockResponse);
    });

    it('should include search param when provided', () => {
      service.getReciters('عبد الباسط', 2, 6).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${environment.API_BASE_URL}/reciters/`);
      expect(req.request.params.get('search')).toBe('عبد الباسط');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('page_size')).toBe('6');
      req.flush({ count: 0, next: null, previous: null, results: [] });
    });

    it('should not include search param for whitespace-only input', () => {
      service.getReciters('   ').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${environment.API_BASE_URL}/reciters/`);
      expect(req.request.params.has('search')).toBeFalse();
      req.flush({ count: 0, next: null, previous: null, results: [] });
    });
  });

  describe('createReciter', () => {
    it('should POST reciter data', () => {
      const newReciter = { id: 'rec-1', name: 'القارئ الجديد' };

      service.createReciter(newReciter).subscribe((result) => {
        expect(result.id).toBe(1);
        expect(result.name).toBe('القارئ الجديد');
      });

      const req = httpMock.expectOne(`${environment.API_BASE_URL}/reciters/`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newReciter);
      req.flush({ id: 1, name: 'القارئ الجديد', bio: '', recitations_count: 0 });
    });
  });

  describe('getStats', () => {
    it('should return stats from API response', () => {
      service.getStats().subscribe((stats) => {
        expect(stats.total_reciters).toBe(15);
        expect(stats.isMock).toBeFalsy();
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${environment.API_BASE_URL}/reciters/` && r.params.get('page_size') === '1'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ count: 15, next: null, previous: null, results: [] });
    });

    it('should fall back to mock stats on error', () => {
      service.getStats().subscribe((stats) => {
        expect(stats.isMock).toBeTrue();
        expect(stats.total_reciters).toBe(6);
      });

      const req = httpMock.expectOne((r) => r.url === `${environment.API_BASE_URL}/reciters/`);
      req.flush(null, { status: 500, statusText: 'Server Error' });

      expect(messageServiceSpy.error).toHaveBeenCalled();
    });
  });
});
