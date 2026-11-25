import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AssetsService } from './assets.service';

describe('AssetsService', () => {
  it('getAssets filters by publisher with the publisher_id param the backend reads', () => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    // Act
    TestBed.inject(AssetsService).getAssets([], '', [], 7).subscribe();

    // Assert
    const req = http.expectOne((r) => r.url === `${environment.API_BASE_URL}/assets/`);
    expect(req.request.params.get('publisher_id')).toBe('7');
    expect(req.request.params.has('publisher')).toBeFalse();
    http.verify();
  });
});
