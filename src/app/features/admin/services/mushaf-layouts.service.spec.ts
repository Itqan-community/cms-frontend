import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { MushafLayoutsService } from './mushaf-layouts.service';

describe('MushafLayoutsService', () => {
  let service: MushafLayoutsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MushafLayoutsService],
    });
    service = TestBed.inject(MushafLayoutsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('unwraps the paginated envelope into a plain array', () => {
    // Arrange
    let received: unknown = null;

    // Act
    service.list().subscribe((layouts) => (received = layouts));
    const req = httpMock.expectOne((r) => r.url.endsWith('mushaf-layouts/'));
    req.flush({
      results: [{ id: 1, name: 'Madani 604', page_count: 604, assets_count: 0 }],
      count: 1,
    });

    // Assert
    expect(received).toEqual([{ id: 1, name: 'Madani 604', page_count: 604, assets_count: 0 }]);
  });
});
