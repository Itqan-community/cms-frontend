import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { waitUntilAuthReady } from '../../../core/auth/guards/wait-until-auth-ready';
import { AdminAuthService } from '../services/admin-auth.service';

/** Requires authenticated publisher-scoped admin (`publisher_id` set). */
export const publisherAdminGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  return waitUntilAuthReady().pipe(
    map(() => {
      if (adminAuth.isPublisherAdmin()) {
        return true;
      }
      return router.createUrlTree(['/unauthorized']);
    })
  );
};
