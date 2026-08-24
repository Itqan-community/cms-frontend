import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { waitUntilAuthReady } from '../../../core/auth/guards/wait-until-auth-ready';
import { AdminTenantService } from '../services/admin-tenant.service';

export const tenantReadyGuard: CanActivateFn = () => {
  const tenantService = inject(AdminTenantService);
  const router = inject(Router);

  return waitUntilAuthReady().pipe(
    switchMap(() =>
      tenantService.ensureReady().pipe(
        map((ready) => (ready ? true : router.createUrlTree(['/unauthorized']))),
        catchError(() => of(router.createUrlTree(['/unauthorized'])))
      )
    )
  );
};
