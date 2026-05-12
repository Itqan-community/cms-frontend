import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminAuthService } from './admin-auth.service';

describe('AdminAuthService', () => {
  let adminAuth: AdminAuthService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AdminAuthService,
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              id: '1',
              name: 'T',
              email: 't@e.com',
              phone: '',
              is_active: true,
              is_profile_completed: true,
              permissions: [
                PORTAL_PERMISSIONS.PORTAL_ACCESS,
                PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR,
              ],
            }),
          },
        },
      ],
    });
    adminAuth = TestBed.inject(AdminAuthService);
  });

  it('hasPermission returns true only for granted codes', () => {
    expect(adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS)).toBe(true);
    expect(adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_TAFSIR)).toBe(false);
  });

  it('hasAnyPermission respects mode', () => {
    expect(
      adminAuth.hasAnyPermission([
        PORTAL_PERMISSIONS.PORTAL_DELETE_RECITER,
        PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR,
      ])
    ).toBe(true);
    expect(adminAuth.hasAnyPermission([PORTAL_PERMISSIONS.PORTAL_DELETE_RECITER])).toBe(false);
    expect(adminAuth.hasAnyPermission([])).toBe(true);
  });

  it('hasAllPermissions requires every code', () => {
    expect(
      adminAuth.hasAllPermissions([
        PORTAL_PERMISSIONS.PORTAL_ACCESS,
        PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR,
      ])
    ).toBe(true);
    expect(
      adminAuth.hasAllPermissions([
        PORTAL_PERMISSIONS.PORTAL_ACCESS,
        PORTAL_PERMISSIONS.PORTAL_CREATE_TAFSIR,
      ])
    ).toBe(false);
    expect(adminAuth.hasAllPermissions([])).toBe(true);
  });
});
