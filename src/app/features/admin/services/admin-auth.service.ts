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

  // Derive admin roles
  readonly isAdmin = computed(() => !!this.currentUser()?.is_admin);

  readonly isItqanAdmin = computed(
    () => this.isAdmin() && this.currentUser()?.publisher_id == null
  );

  readonly isPublisherAdmin = computed(
    () => this.isAdmin() && this.currentUser()?.publisher_id != null
  );

  readonly publisherId = computed(() => this.currentUser()?.publisher_id ?? null);

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
