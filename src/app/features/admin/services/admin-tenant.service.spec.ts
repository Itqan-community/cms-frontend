import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ADMIN_TENANT_STORAGE_KEY, AdminTenantService } from './admin-tenant.service';

describe('AdminTenantService', () => {
  let service: AdminTenantService;
  let httpMock: HttpTestingController;
  const adminApi = environment.ADMIN_API_BASE_URL;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [AdminTenantService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminTenantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('preselects first publisher when there is no saved selection', (done) => {
    if (!adminApi) {
      pending('ADMIN_API_BASE_URL');
      done();
      return;
    }

    service.ensureReady().subscribe((ready) => {
      expect(ready).toBe(true);
      expect(service.selectedPublisherId()).toBe(10);
      expect(localStorage.getItem(ADMIN_TENANT_STORAGE_KEY)).toBe('10');
      done();
    });

    const req = httpMock.expectOne(`${adminApi}/publishers/me/`);
    req.flush([
      { id: 10, name: 'Publisher A', slug: 'a', icon_url: null, domains: [] },
      { id: 20, name: 'Publisher B', slug: 'b', icon_url: null, domains: [] },
    ]);
  });

  it('keeps stored publisher id when present in fetched list', (done) => {
    if (!adminApi) {
      pending('ADMIN_API_BASE_URL');
      done();
      return;
    }

    localStorage.setItem(ADMIN_TENANT_STORAGE_KEY, '20');
    service.ensureReady().subscribe((ready) => {
      expect(ready).toBe(true);
      expect(service.selectedPublisherId()).toBe(20);
      done();
    });

    const req = httpMock.expectOne(`${adminApi}/publishers/me/`);
    req.flush([
      { id: 10, name: 'Publisher A', slug: 'a', icon_url: null, domains: [] },
      { id: 20, name: 'Publisher B', slug: 'b', icon_url: null, domains: [] },
    ]);
  });

  it('falls back to first publisher when stored id is invalid', (done) => {
    if (!adminApi) {
      pending('ADMIN_API_BASE_URL');
      done();
      return;
    }

    localStorage.setItem(ADMIN_TENANT_STORAGE_KEY, '999');
    service.ensureReady().subscribe((ready) => {
      expect(ready).toBe(true);
      expect(service.selectedPublisherId()).toBe(10);
      expect(localStorage.getItem(ADMIN_TENANT_STORAGE_KEY)).toBe('10');
      done();
    });

    const req = httpMock.expectOne(`${adminApi}/publishers/me/`);
    req.flush([
      { id: 10, name: 'Publisher A', slug: 'a', icon_url: null, domains: [] },
      { id: 20, name: 'Publisher B', slug: 'b', icon_url: null, domains: [] },
    ]);
  });
});
