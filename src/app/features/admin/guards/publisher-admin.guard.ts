import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

/** Requires authenticated publisher-scoped admin (`publisher_id` set). */
export const publisherAdminGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  if (adminAuth.isPublisherAdmin()) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
