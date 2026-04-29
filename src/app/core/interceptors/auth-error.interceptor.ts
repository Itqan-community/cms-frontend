import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';
import * as Sentry from '@sentry/angular';
import {
  isReauthenticationBody,
  tryNavigateForAuth401,
} from '../auth/headless/headless-auth-flow.util';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';
import { HeadlessAuthApiService } from '../auth/headless/headless-auth-api.service';
import { AuthService } from '../auth/services/auth.service';
import {
  isHeadlessAppAuthUrl,
  isHeadlessAccountWebAuthnAuthenticatorsUrl,
} from '../auth/headless/headless-api-path.util';
import { environment } from '../../../environments/environment';

/**
 * Set on a single retry after `GET /auth/.../session` succeeds, to avoid infinite loops.
 * Internal only — not an external API contract.
 */
export const SESSION_401_RECHECK_HEADER = 'X-Cms-Auth-Session-Recheck';

/** Set after one `POST /auth/app/v1/tokens/refresh` + retry, to avoid refresh loops. */
export const CMS_401_REFRESH_HEADER = 'X-Cms-Auth-Refresh-Attempted';

/**
 * App mode: 401 on app auth with flows → client routing. 401/403 on CMS → `X-Session-Token` + session resync, retry once.
 * 410 on app headless = session invalid (Gone) → clear local tokens and go to login.
 */
export function authErrorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const router = inject(Router);
  const apiBase = environment.API_BASE_URL;
  const tokenStore = inject(HeadlessAppTokenService);
  const headless = inject(HeadlessAuthApiService);

  const runCms401Recovery = (err: HttpErrorResponse): Observable<HttpEvent<unknown>> => {
    if (!apiBase || !req.url.startsWith(apiBase) || isHeadlessAppAuthUrl(req.url)) {
      return throwError(() => err);
    }
    if (!req.headers.has(CMS_401_REFRESH_HEADER) && tokenStore.getRefreshToken()) {
      return headless.refreshAccessToken().pipe(
        tap((res) => tokenStore.applyTokenRefreshResponse(res)),
        switchMap(() =>
          next(
            req.clone({
              setHeaders: { [CMS_401_REFRESH_HEADER]: '1' },
            })
          )
        ),
        catchError(() => runCmsSessionRecheck(err))
      );
    }
    return runCmsSessionRecheck(err);
  };

  const runCmsSessionRecheck = (err: HttpErrorResponse): Observable<HttpEvent<unknown>> => {
    if (!apiBase || !req.url.startsWith(apiBase) || isHeadlessAppAuthUrl(req.url)) {
      return throwError(() => err);
    }
    if (!req.headers.has(SESSION_401_RECHECK_HEADER)) {
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
          return throwError(() => err);
        })
      );
    }
    authService.invalidateClientAuthAndGoLogin();
    return throwError(() => err);
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isReauthenticationBody(error.error)) {
        if (!isHeadlessAccountWebAuthnAuthenticatorsUrl(req.url)) {
          const returnUrl = router.url;
          void router.navigate(['/reauthenticate'], { queryParams: { returnUrl } });
        }
        return throwError(() => error);
      }

      if (error.status === 410 && isHeadlessAppAuthUrl(req.url)) {
        authService.invalidateClientAuthAndGoLogin();
        return throwError(() => error);
      }

      if (error.status === 401 || error.status === 403) {
        if (isHeadlessAppAuthUrl(req.url)) {
          if (error.status === 401) {
            tryNavigateForAuth401(router, error);
          }
          return throwError(() => error);
        }

        if (apiBase && req.url.startsWith(apiBase)) {
          return runCms401Recovery(error);
        }
      } else if (error.status !== 410) {
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
