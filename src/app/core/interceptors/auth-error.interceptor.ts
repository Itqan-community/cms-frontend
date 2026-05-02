import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import * as Sentry from '@sentry/angular';
import {
  ALLAUTH_REAUTHENTICATE_URL,
} from '../auth/headless/allauth-auth.hooks';
import { AllauthAuthChangeBus } from '../auth/headless/allauth-auth-change.bus';
import { applyAllauthEnvelopeSideEffects } from '../auth/headless/allauth-envelope.util';
import {
  isHeadlessAppAuthUrl,
  isHeadlessAccountWebAuthnAuthenticatorsUrl,
} from '../auth/headless/headless-api-path.util';
import {
  isReauthenticationBody,
  tryNavigateForAuth401,
} from '../auth/headless/headless-auth-flow.util';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';
import { AuthService } from '../auth/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Set on a single retry after `GET /auth/.../session` succeeds, to avoid infinite loops.
 * Internal only — not an external API contract.
 */
export const SESSION_401_RECHECK_HEADER = 'X-Cms-Auth-Session-Recheck';

/**
 * App-mode headless: sync envelope side-effects from JSON bodies.
 * CMS APIs: one session recheck via `X-Session-Token`, then logout.
 */
export function authErrorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const router = inject(Router);
  const apiBase = environment.API_BASE_URL;
  const tokenStore = inject(HeadlessAppTokenService);
  const authBus = inject(AllauthAuthChangeBus);

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
      if (
        error.error &&
        typeof error.error === 'object' &&
        isHeadlessAppAuthUrl(req.url)
      ) {
        applyAllauthEnvelopeSideEffects(error.error, tokenStore, authBus);
      }

      if (error.status === 401 && isReauthenticationBody(error.error)) {
        if (!isHeadlessAccountWebAuthnAuthenticatorsUrl(req.url)) {
          void router.navigate([ALLAUTH_REAUTHENTICATE_URL], {
            queryParams: { next: router.url },
          });
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
          return runCmsSessionRecheck(error);
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
