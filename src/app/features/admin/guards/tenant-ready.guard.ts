import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { waitUntilAuthReady } from '../../../core/auth/guards/wait-until-auth-ready';
import { AdminTenantService } from '../services/admin-tenant.service';
import { consumeTenantSwitch } from '../utils/admin-tenant-navigation.util';

export const tenantReadyGuard: CanActivateFn = () => {
  const tenantService = inject(AdminTenantService);
  const router = inject(Router);
  // A publisher-loading failure is not a permission denial: keep /unauthorized from treating
  // it as a post-switch redirect (see afterTenantSwitchGuard).
  const unauthorized = () => {
    consumeTenantSwitch();
    return router.createUrlTree(['/unauthorized']);
  };

  return waitUntilAuthReady().pipe(
    switchMap(() =>
      tenantService.ensureReady().pipe(
        map((ready) => (ready ? true : unauthorized())),
        catchError(() => of(unauthorized()))
      )
    )
  );
};
