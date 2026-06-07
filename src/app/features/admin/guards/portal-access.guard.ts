import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminAuthService } from '../services/admin-auth.service';

/** Requires `portal_access` (after {@link authGuard} when composed). */
export const portalAccessGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS)) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
