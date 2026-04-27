import { HttpEvent, HttpRequest } from '@angular/common/http';
import { HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';
import { isHeadlessAppAuthUrl } from '../auth/headless/headless-api-path.util';
import { getDjangoCsrfTokenForRequest, isUnsafeHttpMethod } from '../utils/csrf.util';

/**
 * App headless: `Authorization: Bearer` for CMS API routes; skip CSRF when Bearer is used or on `/auth/app/v1/`.
 * Legacy: CSRF for unsafe methods when no app access token and not an app auth URL.
 * @see https://docs.djangoproject.com/en/stable/ref/csrf/
 */
export function headersInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const tokenStore = inject(HeadlessAppTokenService);
  const api = environment.API_BASE_URL;
  const isApi = api ? req.url.startsWith(api) : false;
  const isAppAuth = isHeadlessAppAuthUrl(req.url);
  const access = tokenStore.getAccessToken();
  const addBearer = isApi && !isAppAuth && !!access;
  const useCsrf = isApi && isUnsafeHttpMethod(req.method) && !isAppAuth && !addBearer;
  const csrf = useCsrf ? getDjangoCsrfTokenForRequest() : null;

  req = req.clone({
    setHeaders: {
      ...(addBearer ? { Authorization: `Bearer ${access}` } : {}),
      ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      'Accept-Language': localStorage.getItem('lang') || 'ar',
    },
  });
  return next(req);
}
