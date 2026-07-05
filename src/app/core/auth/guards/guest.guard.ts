import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guest Guard - Prevents authenticated users from accessing guest-only routes
 *
 * This guard is used for routes like login and register pages that should
 * only be accessible to unauthenticated users. If a logged-in user tries
 * to access these routes, they are redirected to the main application.
 *
 * @example
 * ```typescript
 * {
 *   path: 'login',
 *   component: LoginComponent,
 *   canActivate: [guestGuard]
 * }
 * ```
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.bootstrapDone).pipe(
    filter(Boolean),
    take(1),
    map(() => {
      if (!authService.isLoggedIn()) {
        return true;
      }

      // Already logged in, redirect to home
      router.navigate(['/gallery']);
      return false;
    })
  );
};
