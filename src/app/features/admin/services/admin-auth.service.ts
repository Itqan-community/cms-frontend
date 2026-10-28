import { inject, Injectable, computed } from '@angular/core';
import { AuthService } from '../../../core/auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  private readonly authService = inject(AuthService);

  // Expose the current user from AuthService
  readonly currentUser = this.authService.currentUser;

  readonly permissionCodes = computed(() => {
    const list = this.currentUser()?.permissions;
    if (!list?.length) {
      return new Set<string>();
    }
    return new Set(list);
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
