import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth.service';
import { permissionGuard } from './permission.guard';
import { AdminAuthService } from '../services/admin-auth.service';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';

describe('permissionGuard', () => {
  async function runGuard(result: ReturnType<ReturnType<typeof permissionGuard>>) {
    if (typeof result === 'boolean' || result instanceof UrlTree) {
      return result;
    }
    return await firstValueFrom(result as Observable<boolean | UrlTree>);
  }

  it('allows when user has required permission', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminAuthService,
          useValue: {
            hasAnyPermission: () => false,
            hasAllPermissions: (codes: string[]) =>
              codes.includes(PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR),
          },
        },
        {
          provide: AuthService,
          useValue: { authReady: signal(true) },
        },
        { provide: Router, useValue: { createUrlTree: (x: unknown[]) => ({ urlTree: x }) } },
      ],
    });
    const guard = permissionGuard({
      permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR],
    });
    const result = await runGuard(
      TestBed.runInInjectionContext(() => guard(null as never, null as never))
    );
    expect(result).toBe(true);
  });

  it('redirects to /unauthorized when permission missing', async () => {
    const tree = { toString: () => '/unauthorized' } as unknown as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminAuthService,
          useValue: {
            hasAnyPermission: () => false,
            hasAllPermissions: () => false,
          },
        },
        {
          provide: AuthService,
          useValue: { authReady: signal(true) },
        },
        { provide: Router, useValue: { createUrlTree: () => tree } },
      ],
    });
    const guard = permissionGuard({
      permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR],
    });
    const result = await runGuard(
      TestBed.runInInjectionContext(() => guard(null as never, null as never))
    );
    expect(result).toBe(tree);
  });
});
