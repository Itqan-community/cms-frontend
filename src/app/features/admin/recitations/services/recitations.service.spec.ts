import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RecitationsService } from './recitations.service';

describe('RecitationsService', () => {
  let service: RecitationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RecitationsService],
    });
    service = TestBed.inject(RecitationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose qiraah and riwayah options from API list', (done) => {
    service.qiraahOptions().subscribe((q) => {
      expect(q).toEqual([{ id: 1, name: 'حفص' }]);

      service.riwayahOptions().subscribe((r) => {
        expect(r).toEqual([{ id: 11, name: 'عن عاصم' }]);
        done();
      });

      const req2 = httpMock.expectOne((req) => req.url.includes('/portal/filters/riwayahs/'));
      req2.flush({
        count: 1,
        results: [{ id: 11, name: 'عن عاصم' }],
      });
    });

    const req1 = httpMock.expectOne((req) => req.url.includes('/portal/filters/qiraahs/'));
    req1.flush({
      count: 1,
      results: [{ id: 1, name: 'حفص' }],
    });
  });

  it('getList should request recitations list from API', (done) => {
    service
      .getList({
        page: 1,
        page_size: 10,
        search: 'تلاوة',
      })
      .subscribe((res) => {
        expect(res.count).toBe(1);
        expect(Array.isArray(res.results)).toBe(true);
        done();
      });

    const req = httpMock.expectOne((r) => r.url.includes('/portal/recitations/'));
    expect(req.request.method).toBe('GET');
    req.flush({ count: 1, results: [] });
  });

  it('getDetail should request detail from API by slug', (done) => {
    service.getDetail('recitation-1').subscribe((d) => {
      expect(d.id).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/portal/recitations/recitation-1/'));
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1 });
  });

  it('delete should request API delete by slug', (done) => {
    service.delete('recitation-1').subscribe(() => done());
    const req = httpMock.expectOne((r) => r.url.includes('/portal/recitations/recitation-1/'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
