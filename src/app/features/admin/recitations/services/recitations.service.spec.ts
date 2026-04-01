import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RecitationsService, PaginatedResponse } from './recitations.service';
import { RecitationItem } from '../models/recitations.models';
import { environment } from '../../../../../environments/environment';

describe('RecitationsService', () => {
  let service: RecitationsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.API_BASE_URL}/recitations/`;

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

  it('should fetch recitations with correct parameters', () => {
    const mockResponse: PaginatedResponse<RecitationItem> = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          name: 'Test Recitation',
          description: 'Description',
          publisher: { id: 1, name: 'Publisher' },
          reciter: { id: 'reciter1', name: 'Reciter', name_en: 'Reciter EN' },
          riwayah: { id: 1, name: 'Hafs' },
          qiraah: { id: 1, name: 'Asim' },
          surahs_count: 114,
        },
      ],
    };

    service.getRecitations(1, 10, 'search text', 'Hafs', 'murattal').subscribe((res) => {
      expect(res.results.length).toBe(1);
      expect(res.results).toEqual(mockResponse.results);
    });

    const req = httpMock.expectOne(
      (request) =>
        request.url === apiUrl &&
        request.params.get('page') === '1' &&
        request.params.get('page_size') === '10' &&
        request.params.get('search') === 'search text' &&
        request.params.get('riwayah') === 'Hafs' &&
        request.params.get('type') === 'murattal'
    );

    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should delete a recitation', () => {
    const id = 123;
    service.deleteRecitation(id).subscribe((res) => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne(`${apiUrl}${id}/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
