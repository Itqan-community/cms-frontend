import { HttpEvent, HttpRequest } from '@angular/common/http';
import { HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';
import {
  isHeadlessAppAuthUrl,
  shouldOmitHeadlessSessionTokenForRequest,
} from '../auth/headless/headless-api-path.util';
import { getDjangoCsrfTokenForRequest, isUnsafeHttpMethod } from '../utils/csrf.util';

/**
 * Attaches `X-Session-Token` for **all** CMS API URLs when stored (official app-mode demo behaviour).
 * Prefers session token over Bearer when both exist.
 */
export function headersInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const tokenStore = inject(HeadlessAppTokenService);
  const api = environment.API_BASE_URL;
  const isApi = api ? req.url.startsWith(api) : false;
  const isAppAuth = isHeadlessAppAuthUrl(req.url);
  const session = tokenStore.getSessionToken();
  const access = tokenStore.getAccessToken();

  const omitSession =
    req.url.includes('/auth/app/v1/config') ||
    shouldOmitHeadlessSessionTokenForRequest(req.url, req.method);

  const addBearer = isApi && !isAppAuth && !!access && !session;

  const useCsrf =
    isApi &&
    isUnsafeHttpMethod(req.method) &&
    !isAppAuth &&
    !addBearer &&
    !session;

  const csrf = useCsrf ? getDjangoCsrfTokenForRequest() : null;

  req = req.clone({
    setHeaders: {
      ...(addBearer ? { Authorization: `Bearer ${access}` } : {}),
      ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      ...(isApi && session && !omitSession ? { 'X-Session-Token': session } : {}),
      'Accept-Language': localStorage.getItem('lang') || 'ar',
    },
  });
  return next(req);
}
