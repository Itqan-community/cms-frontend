import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReciterService } from './reciter.service';
import { environment } from '../../../../../environments/environment';
import { ApiReciters } from '../models/reciter.model';

describe('ReciterService', () => {
  let service: ReciterService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ReciterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch reciters and return the response', () => {
    const mockResponse: ApiReciters = {
      results: [{ id: 1, name: 'Test Reciter', recitations_count: 2 }],
      count: 1,
    };

    service.getReciters(1, 20).subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.API_BASE_URL}/reciters/` &&
        r.params.get('page') === '1' &&
        r.params.get('page_size') === '20'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should use page 2 and page_size 10 when specified', () => {
    const mockResponse: ApiReciters = { results: [], count: 0 };

    service.getReciters(2, 10).subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.API_BASE_URL}/reciters/` &&
        r.params.get('page') === '2' &&
        r.params.get('page_size') === '10'
    );
    req.flush(mockResponse);
  });
});
