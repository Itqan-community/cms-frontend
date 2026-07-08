import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { waitUntilAuthReady } from './wait-until-auth-ready';

/**
 * Profile Completed Guard - Ensures user has completed their profile
 */
export const profileCompletedGuard: CanActivateFn = () => {
  const router = inject(Router);

  return waitUntilAuthReady().pipe(
    map((authService) => {
      const user = authService.getCurrentUser();

      if (user?.is_profile_completed) {
        return true;
      }

      router.navigate(['/complete-profile']);
      return false;
    })
  );
};
