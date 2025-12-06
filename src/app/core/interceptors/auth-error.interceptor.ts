import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, Observable, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';

/**
 * Track if a token refresh is currently in progress
 * This prevents multiple simultaneous refresh attempts
 */
let isRefreshing = false;

/**
 * Subject to queue requests while token is being refreshed
 */
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * Auth Error Interceptor
 * Handles 401 and 403 errors by attempting to refresh the access token
 * and retrying the failed request with the new token.
 *
 * Features:
 * - Automatic token refresh on 401/403 errors
 * - Request queuing during token refresh to prevent race conditions
 * - Single refresh attempt for multiple simultaneous 401s
 * - Automatic logout on refresh failure
 */
export function authErrorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthRequest =
        req.url.endsWith('/login') ||
        req.url.endsWith('/register') ||
        req.url.endsWith('/forgot-password') ||
        req.url.endsWith('/reset-password');

      // Escape auth requests, no need to check token
      if (isAuthRequest) {
        return throwError(() => error);
      }

      // Handle 401 Unauthorized and 403 Forbidden errors
      if (error.status === 401 || error.status === 403) {
        return handle401Or403Error(req, next, authService, router);
      }

      // For other errors, pass them through
      return throwError(() => error);
    })
  );
}

/**
 * Handles 401 and 403 errors by refreshing the token and retrying the request
 */
function handle401Or403Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  // Skip refresh logic if the request itself is a token refresh attempt
  if (req.url.includes('/auth/token/refresh')) {
    // If refresh endpoint itself fails, logout
    authService.logout().subscribe(() => {
      router.navigate(['/login']);
    });
    return throwError(() => new Error('Token refresh failed'));
  }

  // If not currently refreshing, start the refresh process
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = authService.getRefreshToken();

    // If no refresh token exists, logout immediately
    if (!refreshToken) {
      isRefreshing = false;
      authService.logout().subscribe(() => {
        router.navigate(['/login']);
      });
      return throwError(() => new Error('No refresh token available'));
    }

    // Attempt to refresh the token
    return authService.refreshToken().pipe(
      switchMap((tokenResponse) => {
        isRefreshing = false;

        // Broadcast the new token to all waiting requests
        refreshTokenSubject.next(tokenResponse.access);

        // Retry the original request with the new token
        return next(addAuthHeader(req, tokenResponse.access));
      }),
      catchError((error) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);

        // If refresh fails, logout and redirect to login
        authService.logout().subscribe(() => {
          router.navigate(['/login']);
        });

        return throwError(() => error);
      })
    );
  } else {
    // If already refreshing, queue this request until refresh completes
    return refreshTokenSubject.pipe(
      filter((token) => token !== null), // Wait for a non-null token
      take(1), // Take only the first emitted token
      switchMap((token) => {
        // Retry the request with the new token
        return next(addAuthHeader(req, token!));
      })
    );
  }
}

/**
 * Clones the request and adds the Authorization header with the provided token
 */
function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}
