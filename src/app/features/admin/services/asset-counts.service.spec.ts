import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { CALLER_SHOWS_ERRORS } from '../../../core/interceptors/caller-shows-errors.context';
import { AssetCountsService } from './asset-counts.service';

describe('AssetCountsService', () => {
  let service: AssetCountsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AssetCountsService],
    });
    service = TestBed.inject(AssetCountsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads the portal asset counts and keeps the global error toast quiet', () => {
    // Arrange
    let received: unknown = null;

    // Act
    service.get().subscribe((counts) => (received = counts));
    const req = httpMock.expectOne((r) => r.url.endsWith('/portal/asset-counts/'));
    req.flush({ categories: [{ category: 'font', total: 1, drafts: 0, tags: [] }] });

    // Assert
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(CALLER_SHOWS_ERRORS)).toBeTrue();
    expect(received).toEqual({ categories: [{ category: 'font', total: 1, drafts: 0, tags: [] }] });
  });
});
