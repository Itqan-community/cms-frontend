import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Publisher } from '../models/publishers-stats.models';
import { PublishersService } from './publishers.service';

describe('PublishersService', () => {
  let service: PublishersService;
  let httpMock: HttpTestingController;

  const mockPublisher: Publisher = {
    id: '123',
    name_ar: 'كل آية',
    name_en: 'Every Ayah',
    country: 'Saudi Arabia',
    is_verified: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(PublishersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch publisher details by id', () => {
    let result: Publisher | undefined;

    service.getPublisherById('123').subscribe((publisher) => {
      result = publisher;
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/portal/publishers/123'));
    expect(req.request.method).toBe('GET');
    req.flush(mockPublisher);

    expect(result).toEqual(mockPublisher);
  });

  it('should update publisher using PUT', () => {
    let result: Publisher | undefined;
    const payload = { name_en: 'Updated' };

    service.updatePublisher('123', payload).subscribe((publisher) => {
      result = publisher;
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/portal/publishers/123'));
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockPublisher, ...payload });

    expect(result?.name_en).toBe('Updated');
  });

  it('should fallback to PATCH when PUT is not supported', () => {
    let result: Publisher | undefined;
    const payload = { name_en: 'Patched' };

    service.updatePublisher('123', payload).subscribe((publisher) => {
      result = publisher;
    });

    const putReq = httpMock.expectOne((r) => r.url.endsWith('/portal/publishers/123'));
    expect(putReq.request.method).toBe('PUT');
    putReq.flush(null, { status: 405, statusText: 'Method Not Allowed' });

    const patchReq = httpMock.expectOne((r) => r.url.endsWith('/portal/publishers/123'));
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ ...mockPublisher, ...payload });

    expect(result?.name_en).toBe('Patched');
  });

  it('should delete publisher by id', () => {
    let completed = false;

    service.deletePublisher('123').subscribe(() => {
      completed = true;
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/portal/publishers/123'));
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    expect(completed).toBeTrue();
  });
});
