import { isPlatformBrowser } from '@angular/common';
import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Observable, timeout } from 'rxjs';

const SSR_HTTP_TIMEOUT_MS = 10_000;

/**
 * Bounds outgoing HTTP calls during SSR so a slow or hung backend never stalls HTML rendering
 * indefinitely. No-op in the browser.
 */
export function ssrTimeoutInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return next(req);
  }
  return next(req).pipe(timeout(SSR_HTTP_TIMEOUT_MS));
}
