import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import * as Sentry from '@sentry/angular';
import { ALLAUTH_REAUTHENTICATE_URL } from '../auth/headless/allauth-auth.hooks';
import { AllauthAuthChangeBus } from '../auth/headless/allauth-auth-change.bus';
import { applyAllauthEnvelopeSideEffects } from '../auth/headless/allauth-envelope.util';
import {
  isHeadlessAppAuthUrl,
  isHeadlessAccountWebAuthnAuthenticatorsUrl,
  isHeadlessAppSessionUrl,
} from '../auth/headless/headless-api-path.util';
import {
  isReauthenticationBody,
  tryNavigateForAuth401,
} from '../auth/headless/headless-auth-flow.util';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';
import { AuthService } from '../auth/services/auth.service';
import { shouldSuppressSentryForHeadlessHttpError } from './auth-error-sentry-suppress.util';
import { environment } from '../../../environments/environment';

/**
 * App-mode headless: sync envelope side-effects from JSON bodies.
 * CMS APIs: one `AuthService.sessionRecheckAfter401()` (allauth session) then logout; CMS calls use Bearer per `headersInterceptor`.
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
    return authService.sessionRecheckAfter401().pipe(
      switchMap((stillAuthenticated) => {
        if (stillAuthenticated) {
          return next(req);
        }
        authService.invalidateClientAuthAndGoLogin();
        return throwError(() => err);
      })
    );
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.error && typeof error.error === 'object' && isHeadlessAppAuthUrl(req.url)) {
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
        if (tokenStore.getSessionToken()) {
          authService.invalidateClientAuthAndGoLogin();
        } else if (isHeadlessAppSessionUrl(req.url) && req.method === 'GET') {
          tokenStore.clearSessionToken();
        }
        return throwError(() => error);
      }

      if (error.status === 401 || error.status === 403) {
        if (isHeadlessAppAuthUrl(req.url)) {
          if (error.status === 401) {
            tryNavigateForAuth401(router, error);
          }
          return throwError(() => error);
        }

        const adminApiBase = (environment as unknown as { ADMIN_API_BASE_URL?: string })
          .ADMIN_API_BASE_URL;
        const isApiRequest =
          (apiBase && req.url.includes(apiBase)) ||
          (adminApiBase && req.url.includes(adminApiBase));
        if (isApiRequest) {
          return runCmsSessionRecheck(error);
        }
      } else if (error.status !== 410) {
        const suppressSentry = shouldSuppressSentryForHeadlessHttpError(req.url, req.method, error);
        if (!suppressSentry) {
          Sentry.captureException(error, {
            extra: {
              url: req.url,
              method: req.method,
              status: error.status,
              statusText: error.statusText,
            },
          });
        }
      }

      return throwError(() => error);
    })
  );
}
