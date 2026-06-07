import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export type PermissionGuardMode = 'any' | 'all';

export interface PermissionGuardOptions {
  permissions: string[];
  mode?: PermissionGuardMode;
}

export function permissionGuard(options: PermissionGuardOptions): CanActivateFn {
  const mode = options.mode ?? 'all';
  const required = options.permissions;

  return () => {
    const adminAuth = inject(AdminAuthService);
    const router = inject(Router);

    const ok =
      mode === 'any' ? adminAuth.hasAnyPermission(required) : adminAuth.hasAllPermissions(required);

    if (ok) {
      return true;
    }

    return router.createUrlTree(['/unauthorized']);
  };
}
