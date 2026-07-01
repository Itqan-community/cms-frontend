import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  ADMIN_TENANT_STORAGE_KEY,
  AdminTenantService,
} from '../../features/admin/services/admin-tenant.service';
import { tenantHeaderInterceptor } from './tenant-header.interceptor';

describe('tenantHeaderInterceptor', () => {
  const adminApi = environment.ADMIN_API_BASE_URL;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  function setup() {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantHeaderInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      httpMock: TestBed.inject(HttpTestingController),
      router,
    };
  }

  it('adds X-Tenant header to portal requests across verbs', () => {
    if (!adminApi) {
      pending('ADMIN_API_BASE_URL');
      return;
    }

    localStorage.setItem(ADMIN_TENANT_STORAGE_KEY, '77');
    const { http, httpMock } = setup();
    const url = `${adminApi}/tafsirs/`;

    http.get(url).subscribe();
    let req = httpMock.expectOne(url);
    expect(req.request.headers.get('X-Tenant')).toBe('77');
    req.flush({});

    http.post(url, { ok: true }).subscribe();
    req = httpMock.expectOne(url);
    expect(req.request.headers.get('X-Tenant')).toBe('77');
    req.flush({});

    http.patch(url, { ok: true }).subscribe();
    req = httpMock.expectOne(url);
    expect(req.request.headers.get('X-Tenant')).toBe('77');
    req.flush({});

    http.delete(url).subscribe();
    req = httpMock.expectOne(url);
    expect(req.request.headers.get('X-Tenant')).toBe('77');
    req.flush({});

    httpMock.verify();
  });

  it('skips tenant header for publishers bootstrap endpoint', () => {
    if (!adminApi) {
      pending('ADMIN_API_BASE_URL');
      return;
    }

    localStorage.setItem(ADMIN_TENANT_STORAGE_KEY, '77');
    const { http, httpMock } = setup();
    const url = `${adminApi}/publishers/me/`;

    http.get(url).subscribe();
    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('X-Tenant')).toBeNull();
    req.flush([]);
    httpMock.verify();
  });

  it('does not add tenant header outside portal API', () => {
    const { http, httpMock } = setup();
    const url = 'https://example.com/test';

    localStorage.setItem(ADMIN_TENANT_STORAGE_KEY, '77');
    http.get(url).subscribe();
    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('X-Tenant')).toBeNull();
    req.flush({});
    httpMock.verify();
  });

  it('uses in-memory tenant selection when localStorage key is missing', () => {
    if (!adminApi) {
      pending('ADMIN_API_BASE_URL');
      return;
    }

    const { http, httpMock } = setup();
    const tenantService = TestBed.inject(AdminTenantService);
    tenantService.selectedPublisherId.set(33);

    const url = `${adminApi}/recitations/`;
    http.get(url).subscribe();
    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('X-Tenant')).toBe('33');
    req.flush({});
    httpMock.verify();
  });

  it('fails closed when tenant is missing for portal requests', (done) => {
    if (!adminApi) {
      pending('ADMIN_API_BASE_URL');
      done();
      return;
    }

    const { http, httpMock, router } = setup();
    const url = `${adminApi}/tafsirs/`;
    http.get(url).subscribe({
      next: () => {
        fail('expected request to fail when tenant is missing');
        done();
      },
      error: (err) => {
        expect(err.status).toBe(403);
        expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
        httpMock.expectNone(url);
        done();
      },
    });
  });

  it('skips tenant header for consumer issue report create', () => {
    if (!adminApi) {
      pending('ADMIN_API_BASE_URL');
      return;
    }

    const { http, httpMock, router } = setup();
    const url = `${adminApi}/issue-reports/`;

    http.post(url, { asset_id: 1, description: 'test issue' }).subscribe();
    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('X-Tenant')).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
    req.flush({ id: 1 });
    httpMock.verify();
  });
});
