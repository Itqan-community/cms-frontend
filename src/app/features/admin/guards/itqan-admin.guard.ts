import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { waitUntilAuthReady } from '../../../core/auth/guards/wait-until-auth-ready';
import { AdminAuthService } from '../services/admin-auth.service';

export const itqanAdminGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  return waitUntilAuthReady().pipe(
    map(() => {
      if (adminAuth.isItqanAdmin()) {
        return true;
      }
      return router.createUrlTree(['/unauthorized']);
    })
  );
};
