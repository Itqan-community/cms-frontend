import { inject, Injectable, computed } from '@angular/core';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminTenantService } from './admin-tenant.service';

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  private readonly authService = inject(AuthService);
  private readonly tenant = inject(AdminTenantService);

  // Expose the current user from AuthService
  readonly currentUser = this.authService.currentUser;

  // Roles are per publisher, so gate on the selected publisher's permissions; the profile's
  // list (merged across publishers) is only a fallback until a publisher is selected.
  // Portal access is not per publisher: the profile grants it to every active member, and a
  // role need not include it.
  readonly permissionCodes = computed(() => {
    const profile = this.currentUser()?.permissions ?? [];
    const selectedId = this.tenant.selectedPublisherId();
    const selected = this.tenant.publishers().find((publisher) => publisher.id === selectedId);
    const codes = new Set(selected ? selected.permissions : profile);
    if (profile.includes(PORTAL_PERMISSIONS.PORTAL_ACCESS)) {
      codes.add(PORTAL_PERMISSIONS.PORTAL_ACCESS);
    }
    return codes;
  });

  // Itqan staff (the profile's `is_staff`): cross-publisher views such as the admin usage reports.
  readonly isStaff = computed(() => !!this.currentUser()?.is_staff);

  hasPermission(code: string): boolean {
    return this.permissionCodes().has(code);
  }

  hasAnyPermission(codes: string[]): boolean {
    if (!codes.length) {
      return true;
    }
    const set = this.permissionCodes();
    return codes.some((c) => set.has(c));
  }

  hasAllPermissions(codes: string[]): boolean {
    if (!codes.length) {
      return true;
    }
    const set = this.permissionCodes();
    return codes.every((c) => set.has(c));
  }
}
