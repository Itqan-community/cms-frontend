import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Profile Completed Guard - Ensures user has completed their profile
 *
 * This guard checks if the authenticated user has completed their profile
 * before allowing access to certain routes. If the profile is not completed,
 * the user is redirected to the complete-profile page.
 *
 * @example
 * ```typescript
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard, profileCompletedGuard]
 * }
 * ```
 */
export const profileCompletedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.bootstrapDone).pipe(
    filter(Boolean),
    take(1),
    map(() => {
      const user = authService.getCurrentUser();

      // If user exists and profile is completed, allow access
      if (user?.is_profile_completed) {
        return true;
      }

      // Profile not completed, redirect to complete-profile page
      router.navigate(['/complete-profile']);
      return false;
    })
  );
};
