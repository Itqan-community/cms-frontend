import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminAuthService } from '../services/admin-auth.service';
import { issueRoutes } from './issues.routes';

/**
 * TD-006 — Verify that every issue-report child route is guarded by permissionGuard.
 *
 * These tests were written BEFORE the guards were uncommented (TDD contract).
 * With guards commented out, the first describe block ("route configuration") fails
 * because `canActivate` is undefined on every child route.
 */
describe('issueRoutes — admin permission guards (TD-006)', () => {
  const urlTree = {} as UrlTree;

  function childRoute(path: string) {
    return issueRoutes[0]?.children?.find((r) => r.path === path);
  }

  function runGuard(path: string): boolean | UrlTree {
    const guard = childRoute(path)!.canActivate![0] as CanActivateFn;
    return TestBed.runInInjectionContext(() => guard(null as never, null as never));
  }

  // ── Route-configuration assertions ────────────────────────────────────────
  // These fail when guards are commented out (canActivate is undefined).
  // They pass once the guards are uncommented.
  describe('route configuration — guards must be wired', () => {
    it('list route (path:"") has canActivate guard', () => {
      expect(childRoute('')?.canActivate?.length).toBeGreaterThan(0);
    });

    it('create route (path:"create") has canActivate guard', () => {
      expect(childRoute('create')?.canActivate?.length).toBeGreaterThan(0);
    });

    it('edit route (path:":id/edit") has canActivate guard', () => {
      expect(childRoute(':id/edit')?.canActivate?.length).toBeGreaterThan(0);
    });

    it('detail route (path:":id") has canActivate guard', () => {
      expect(childRoute(':id')?.canActivate?.length).toBeGreaterThan(0);
    });
  });

  // ── Behavioural: access denied ─────────────────────────────────────────────
  describe('access denied — user without required permissions', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AdminAuthService,
            useValue: { hasAnyPermission: () => false, hasAllPermissions: () => false },
          },
          { provide: Router, useValue: { createUrlTree: () => urlTree } },
        ],
      });
    });

    it('list route redirects to /unauthorized without portal_read_issue_report', () => {
      expect(runGuard('')).toBe(urlTree);
    });

    it('create route redirects to /unauthorized without portal_create_issue_report', () => {
      expect(runGuard('create')).toBe(urlTree);
    });

    it('edit route redirects to /unauthorized without portal_update_issue_report', () => {
      expect(runGuard(':id/edit')).toBe(urlTree);
    });

    it('detail route redirects to /unauthorized without portal_read_issue_report', () => {
      expect(runGuard(':id')).toBe(urlTree);
    });
  });

  // ── Behavioural: access allowed ────────────────────────────────────────────
  describe('access allowed — user with correct permissions', () => {
    const granted: string[] = [
      PORTAL_PERMISSIONS.PORTAL_READ_ISSUE_REPORT,
      PORTAL_PERMISSIONS.PORTAL_CREATE_ISSUE_REPORT,
      PORTAL_PERMISSIONS.PORTAL_UPDATE_ISSUE_REPORT,
    ];

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AdminAuthService,
            useValue: {
              hasAnyPermission: () => false,
              hasAllPermissions: (perms: string[]) => perms.every((p) => granted.includes(p)),
            },
          },
          { provide: Router, useValue: { createUrlTree: () => urlTree } },
        ],
      });
    });

    it('list route allows access with portal_read_issue_report', () => {
      expect(runGuard('')).toBe(true);
    });

    it('create route allows access with portal_create_issue_report', () => {
      expect(runGuard('create')).toBe(true);
    });

    it('edit route allows access with portal_update_issue_report', () => {
      expect(runGuard(':id/edit')).toBe(true);
    });

    it('detail route allows access with portal_read_issue_report', () => {
      expect(runGuard(':id')).toBe(true);
    });
  });
});
