import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  if (adminAuth.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
