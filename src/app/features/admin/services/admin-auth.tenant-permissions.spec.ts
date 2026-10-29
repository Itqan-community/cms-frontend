import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminAuthService } from './admin-auth.service';
import { AdminTenantService, MyPublisherOut } from './admin-tenant.service';

describe('AdminAuthService tenant permissions', () => {
  const publishers = signal<MyPublisherOut[]>([]);
  const selectedPublisherId = signal<number | null>(null);
  let adminAuth: AdminAuthService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    publishers.set([
      {
        id: 1,
        name: 'A',
        slug: 'a',
        icon_url: null,
        permissions: [PORTAL_PERMISSIONS.PORTAL_INVITE_PUBLISHER_MEMBERS],
      },
      { id: 2, name: 'B', slug: 'b', icon_url: null, permissions: [] },
    ]);
    selectedPublisherId.set(null);
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
              permissions: [PORTAL_PERMISSIONS.PORTAL_ACCESS],
            }),
          },
        },
        { provide: AdminTenantService, useValue: { publishers, selectedPublisherId } },
      ],
    });
    adminAuth = TestBed.inject(AdminAuthService);
  });

  it('permissionCodes reflects the selected publisher', () => {
    selectedPublisherId.set(2);
    expect(adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_INVITE_PUBLISHER_MEMBERS)).toBe(false);

    selectedPublisherId.set(1);
    expect(adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_INVITE_PUBLISHER_MEMBERS)).toBe(true);
  });

  it('keeps portal access from the profile when the selected publisher’s role lacks it', () => {
    selectedPublisherId.set(2);

    expect(adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS)).toBe(true);
  });

  it('falls back to profile permissions before a tenant is selected', () => {
    expect(adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS)).toBe(true);
    expect(adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_INVITE_PUBLISHER_MEMBERS)).toBe(false);
  });

  it('falls back to profile permissions when the selected publisher is not in the list', () => {
    selectedPublisherId.set(99);

    expect(adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS)).toBe(true);
  });
});
