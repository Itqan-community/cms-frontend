import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, Observable, switchMap, take, throwError } from 'rxjs';
import * as Sentry from '@sentry/angular';
import { isReauthenticationBody } from '../auth/headless/headless-auth-flow.util';
import { AuthService } from '../auth/services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function isHeadlessOrAppAuthPath(url: string): boolean {
  return url.includes('/auth/browser/v1/') || url.includes('/auth/app/v1/');
}

export function authErrorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isReauthenticationBody(error.error)) {
        const returnUrl = router.url;
        void router.navigate(['/reauthenticate'], { queryParams: { returnUrl } });
        return throwError(() => error);
      }

      if (
        (error.status === 401 || error.status === 403) &&
        isHeadlessOrAppAuthPath(req.url) &&
        !req.url.includes('/tokens/refresh') &&
        !req.url.includes('/auth/token/refresh')
      ) {
        return throwError(() => error);
      }

      if (error.status === 401 || error.status === 403) {
        return handle401Or403Error(req, next, authService, router);
      }

      Sentry.captureException(error, {
        extra: {
          url: req.url,
          method: req.method,
          status: error.status,
          statusText: error.statusText,
        },
      });

      return throwError(() => error);
    })
  );
}

function handle401Or403Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (req.url.includes('/auth/app/v1/tokens/refresh') || req.url.includes('/auth/token/refresh')) {
    isRefreshing = false;
    authService.logout().subscribe(() => {
      void router.navigate(['/login']);
    });
    return throwError(() => new Error('Token refresh failed'));
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);
    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) {
      isRefreshing = false;
      authService.logout().subscribe(() => {
        void router.navigate(['/login']);
      });
      return throwError(() => new Error('No refresh token available'));
    }

    return authService.refreshToken().pipe(
      switchMap((tokenResponse) => {
        isRefreshing = false;
        const access = tokenResponse.access_token;
        if (!access) {
          isRefreshing = false;
          return throwError(() => new Error('No access token'));
        }
        refreshTokenSubject.next(access);
        return next(addAuthHeader(req, access));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        authService.logout().subscribe(() => {
          void router.navigate(['/login']);
        });
        return throwError(() => err);
      })
    );
  }
  return refreshTokenSubject.pipe(
    filter((token) => token !== null),
    take(1),
    switchMap((token) => next(addAuthHeader(req, token!)))
  );
}

function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
