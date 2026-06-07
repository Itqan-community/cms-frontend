import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { permissionGuard } from './permission.guard';
import { AdminAuthService } from '../services/admin-auth.service';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';

describe('permissionGuard', () => {
  it('allows when user has required permission', () => {
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
        { provide: Router, useValue: { createUrlTree: (x: unknown[]) => ({ urlTree: x }) } },
      ],
    });
    const guard = permissionGuard({
      permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR],
    });
    expect(TestBed.runInInjectionContext(() => guard(null as never, null as never))).toBe(true);
  });

  it('redirects to /unauthorized when permission missing', () => {
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
        { provide: Router, useValue: { createUrlTree: () => tree } },
      ],
    });
    const guard = permissionGuard({
      permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR],
    });
    expect(TestBed.runInInjectionContext(() => guard(null as never, null as never))).toBe(tree);
  });
});
