import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { IssuesService } from './issues.service';

describe('IssuesService', () => {
  it('searchAssets calls the portal issue-report-assets endpoint with the search term', () => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    // Act
    TestBed.inject(IssuesService).searchAssets(' warsh ').subscribe();

    // Assert
    const req = http.expectOne(
      (r) => r.url === `${environment.ADMIN_API_BASE_URL}/issue-report-assets/`
    );
    expect(req.request.params.get('search')).toBe('warsh');
    http.verify();
  });
});
