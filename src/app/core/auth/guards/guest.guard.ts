import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { waitUntilAuthReady } from './wait-until-auth-ready';

/**
 * Guest Guard - Prevents authenticated users from accessing guest-only routes
 */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);

  return waitUntilAuthReady().pipe(
    map((authService) => {
      if (!authService.canActivateAsLoggedIn()) {
        return true;
      }

      router.navigate(['/gallery']);
      return false;
    })
  );
};
