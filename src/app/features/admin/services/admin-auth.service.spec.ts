import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminAuthService } from './admin-auth.service';
import { User } from '../../../core/auth/models/auth.model';
import { buildAuthorizedAdminTabs, TAB_MEMBERS } from '../layout/admin-sidebar.component';
import { AdminTenantService } from './admin-tenant.service';

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

describe('AdminAuthService staff', () => {
  const currentUser = signal<User | null>(null);

  function user(overrides: Partial<User>): User {
    return {
      id: '1',
      name: 'User',
      email: 'u@example.com',
      phone: '',
      is_active: true,
      is_profile_completed: true,
      permissions: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    currentUser.set(null);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AdminAuthService,
        { provide: AuthService, useValue: { currentUser } },
        {
          provide: AdminTenantService,
          useValue: { selectedPublisherId: signal(null), publishers: signal([]) },
        },
      ],
    });
  });

  it('treats a user whose profile says is_staff as Itqan staff', () => {
    // Arrange
    currentUser.set(user({ is_staff: true }));

    // Act
    const isStaff = TestBed.inject(AdminAuthService).isStaff();

    // Assert
    expect(isStaff).toBe(true);
  });

  it('does not treat a user without is_staff as Itqan staff', () => {
    // Arrange
    currentUser.set(user({}));

    // Act
    const isStaff = TestBed.inject(AdminAuthService).isStaff();

    // Assert
    expect(isStaff).toBe(false);
  });

  it('hides the members tab from staff who lack the members permission', () => {
    // Arrange — the backend checks the permission for staff too
    currentUser.set(user({ is_staff: true, permissions: ['portal_access'] }));

    // Act
    const tabs = buildAuthorizedAdminTabs(TestBed.inject(AdminAuthService));

    // Assert
    expect(tabs).not.toContain(TAB_MEMBERS);
  });
});
