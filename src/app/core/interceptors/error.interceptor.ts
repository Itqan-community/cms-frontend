import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, Observable, throwError } from 'rxjs';
import { isHeadlessAppAuthUrl } from '../auth/headless/headless-api-path.util';
import {
  fallbackKeyForHttpStatus,
  resolveApiErrorMessage,
  shouldSuppressGlobalErrorToast,
} from '../../shared/utils/api-error-resolver.util';
import { isExpectedTotpAuthenticatorStatusProbe404 } from './auth-error-sentry-suppress.util';
import { CALLER_SHOWS_ERRORS } from './caller-shows-errors.context';

/**
 * Global Error Interceptor
 * Catches all HTTP errors and displays a message to the user using NzMessageService.
 */
export function errorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const platformId = inject(PLATFORM_ID);
  const message = inject(NzMessageService);
  const translate = inject(TranslateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // NzMessageService schedules Zone timers (3000ms + 200ms) that hold SSR stability; skip toasts on the server.
      if (!isPlatformBrowser(platformId)) {
        return throwError(() => error);
      }
      // Ignore auth errors as they are handled by authErrorInterceptor
      if (error.status === 401 || error.status === 403) {
        return throwError(() => error);
      }

      // Headless auth pages handle their own user-facing errors (400, 409, etc.).
      if (isHeadlessAppAuthUrl(req.url)) {
        return throwError(() => error);
      }

      if (isExpectedTotpAuthenticatorStatusProbe404(req.url, req.method, error)) {
        return throwError(() => error);
      }

      // Mushaf pages already show retry UI for CDN failures.
      if (req.url.includes('cdn.jsdelivr.net')) {
        return throwError(() => error);
      }

      // The caller shows its own (more specific) message; a second toast would just repeat it.
      if (req.context.get(CALLER_SHOWS_ERRORS)) {
        return throwError(() => error);
      }

      if (!shouldSuppressGlobalErrorToast(error)) {
        const fallbackKey = fallbackKeyForHttpStatus(error.status);
        const errorMessage = resolveApiErrorMessage(error, { fallbackKey }, translate);
        message.error(errorMessage);
      }

      return throwError(() => error);
    })
  );
}
