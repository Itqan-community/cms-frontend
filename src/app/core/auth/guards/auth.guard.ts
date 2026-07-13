import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { map } from 'rxjs';
import { ALLAUTH_LOGIN_URL } from '../headless/allauth-auth.hooks';
import { waitUntilAuthReady } from './wait-until-auth-ready';

/**
 * Auth Guard - Protects routes that require authentication
 *
 * Waits for {@link AuthService.authReady} (provisional cache or bootstrap done),
 * then allows access when logged in or provisionally restored from cache.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const message = inject(NzMessageService);
  const translate = inject(TranslateService);

  return waitUntilAuthReady().pipe(
    map((authService) => {
      if (authService.canActivateAsLoggedIn()) {
        return true;
      }

      message.warning(translate.instant('AUTH.MUST_LOGIN_TO_VIEW'));

      router.navigate([ALLAUTH_LOGIN_URL], {
        queryParams: { next: state.url },
      });

      return false;
    })
  );
};
