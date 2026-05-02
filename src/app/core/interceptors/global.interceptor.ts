import { HttpEvent, HttpRequest } from '@angular/common/http';
import { HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';
import { isHeadlessAppAuthUrl } from '../auth/headless/headless-api-path.util';
import { getDjangoCsrfTokenForRequest, isUnsafeHttpMethod } from '../utils/csrf.util';

/**
 * CMS/product APIs under `API_BASE_URL`: attach `Authorization: Bearer <access_token>` when stored.
 * Does not attach `X-Session-Token` here — allauth app client uses [`appSessionTokenInterceptor`](./app-session-token.interceptor.ts).
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
