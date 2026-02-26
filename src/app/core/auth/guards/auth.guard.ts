import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard - Protects routes that require authentication
 *
 * This guard checks if the user is authenticated before allowing access to a route.
 * If the user is not authenticated, they are redirected to the login page with
 * a returnUrl query parameter to redirect them back after successful login.
 * A localized toast message is shown when redirecting.
 *
 * @example
 * ```typescript
 * {
 *   path: 'protected',
 *   component: ProtectedComponent,
 *   canActivate: [authGuard]
 * }
 * ```
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const message = inject(NzMessageService);
  const translate = inject(TranslateService);

  if (authService.isLoggedIn()) {
    return true;
  }

  message.warning(translate.instant('AUTH.MUST_LOGIN_TO_VIEW'));

  // Store the attempted URL for redirecting after login
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });

  return false;
};
