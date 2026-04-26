import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import * as Sentry from '@sentry/angular';
import {
  isReauthenticationBody,
  tryNavigateForAuth401,
} from '../auth/headless/headless-auth-flow.util';
import { AuthService } from '../auth/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Set on a single retry after `GET /auth/session` succeeds, to avoid infinite loops.
 * Internal only — not an external API contract.
 */
export const SESSION_401_RECHECK_HEADER = 'X-Cms-Auth-Session-Recheck';

function isHeadlessBrowserAuthUrl(url: string): boolean {
  return url.includes('/auth/browser/v1/');
}

/**
 * Browser mode: no Bearer refresh. On 401/403 to CMS API, re-check session once; then clear client auth.
 */
export function authErrorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const router = inject(Router);
  const apiBase = environment.API_BASE_URL;

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isReauthenticationBody(error.error)) {
        const returnUrl = router.url;
        void router.navigate(['/reauthenticate'], { queryParams: { returnUrl } });
        return throwError(() => error);
      }

      if (error.status === 401 || error.status === 403) {
        if (isHeadlessBrowserAuthUrl(req.url)) {
          if (error.status === 401) {
            tryNavigateForAuth401(router, error);
          }
          return throwError(() => error);
        }

        if (
          apiBase &&
          req.url.startsWith(apiBase) &&
          !req.headers.has(SESSION_401_RECHECK_HEADER)
        ) {
          return authService.sessionRecheckAfter401().pipe(
            switchMap((stillAuthenticated) => {
              if (stillAuthenticated) {
                return next(
                  req.clone({
                    setHeaders: { [SESSION_401_RECHECK_HEADER]: '1' },
                  })
                );
              }
              authService.invalidateClientAuthAndGoLogin();
              return throwError(() => error);
            })
          );
        }

        if (apiBase && req.url.startsWith(apiBase) && req.headers.has(SESSION_401_RECHECK_HEADER)) {
          authService.invalidateClientAuthAndGoLogin();
          return throwError(() => error);
        }
      } else {
        Sentry.captureException(error, {
          extra: {
            url: req.url,
            method: req.method,
            status: error.status,
            statusText: error.statusText,
          },
        });
      }

      return throwError(() => error);
    })
  );
}
