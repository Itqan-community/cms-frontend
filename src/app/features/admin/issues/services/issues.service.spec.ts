import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { SKIP_TENANT_HEADER } from '../../../../core/interceptors/tenant-header.interceptor';
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

  it('listComments and addComment call the report comments endpoint', () => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(IssuesService);
    const url = `${environment.ADMIN_API_BASE_URL}/issue-reports/42/comments/`;

    // Act
    service.listComments(42).subscribe();
    service.addComment(42, { body: 'Hello' }).subscribe();

    // Assert
    expect(http.expectOne((r) => r.method === 'GET' && r.url === url)).toBeTruthy();
    const post = http.expectOne((r) => r.method === 'POST' && r.url === url);
    expect(post.request.body).toEqual({ body: 'Hello' });
    http.verify();
  });

  it('create marks only the gallery request to go without X-Tenant', () => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(IssuesService);
    const url = `${environment.ADMIN_API_BASE_URL}/issue-reports/`;
    const body = { asset_id: 1, description: 'A missing ayah.' };

    // Act
    service.create(body).subscribe();
    service.create(body, { fromGallery: true }).subscribe();

    // Assert
    const [portal, gallery] = http.match(url);
    expect(portal.request.context.get(SKIP_TENANT_HEADER)).toBeFalse();
    expect(gallery.request.context.get(SKIP_TENANT_HEADER)).toBeTrue();
    http.verify();
  });
});
