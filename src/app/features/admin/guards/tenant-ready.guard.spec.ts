import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { AdminTenantService } from '../services/admin-tenant.service';
import { tenantReadyGuard } from './tenant-ready.guard';

describe('tenantReadyGuard', () => {
  const urlTree = {} as UrlTree;
  const routerMock = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
  const tenantServiceMock = jasmine.createSpyObj<AdminTenantService>('AdminTenantService', [
    'ensureReady',
  ]);

  beforeEach(() => {
    TestBed.resetTestingModule();
    routerMock.createUrlTree.and.returnValue(urlTree);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AdminTenantService, useValue: tenantServiceMock },
      ],
    });
  });

  async function runGuard(): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() => tenantReadyGuard({} as never, {} as never));
    if (typeof result === 'boolean' || result instanceof UrlTree) {
      return result;
    }
    return await firstValueFrom(result as Observable<boolean | UrlTree>);
  }

  it('allows activation when tenant service is ready', async () => {
    tenantServiceMock.ensureReady.and.returnValue(of(true));
    const result = await runGuard();
    expect(result).toBe(true);
  });

  it('redirects to unauthorized when tenant service reports not ready', async () => {
    tenantServiceMock.ensureReady.and.returnValue(of(false));
    const result = await runGuard();
    expect(result).toBe(urlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
  });

  it('redirects to unauthorized when tenant resolution fails', async () => {
    tenantServiceMock.ensureReady.and.returnValue(throwError(() => new Error('boom')));
    const result = await runGuard();
    expect(result).toBe(urlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
  });
});
