import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
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

  if (!authService.isLoggedIn()) {
    return true;
  }

  // Already logged in, redirect to home
  router.navigate(['/gallery']);
  return false;
};
