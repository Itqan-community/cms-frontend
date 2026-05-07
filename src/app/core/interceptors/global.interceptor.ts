import { HttpEvent, HttpRequest } from '@angular/common/http';
import { HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';
import { getDjangoCsrfTokenForRequest, isUnsafeHttpMethod } from '../utils/csrf.util';

/**
 * CMS/product APIs under `API_BASE_URL`: attach `X-Session-Token` from the allauth
 * session-token store (covers both CMS and auth API URLs).
 * The old `Authorization: Bearer <access_token>` approach is commented out below
 * for reference — see commit history for removal if needed.
 */
export function headersInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const tokenStore = inject(HeadlessAppTokenService);
  const api = environment.API_BASE_URL;
  const adminApi = (environment as unknown as { ADMIN_API_BASE_URL?: string }).ADMIN_API_BASE_URL;
  const isApi = (api && req.url.startsWith(api)) || (adminApi && req.url.startsWith(adminApi));
  // const isAppAuth = isHeadlessAppAuthUrl(req.url);
  // const access = tokenStore.getAccessToken();

  // const addBearer = isApi && !isAppAuth && !!access;

  const useCsrf = isApi && isUnsafeHttpMethod(req.method); /* && !isAppAuth && !addBearer */

  const csrf = useCsrf ? getDjangoCsrfTokenForRequest() : null;

  const sessionToken = isApi ? tokenStore.getSessionToken() : null;

  req = req.clone({
    setHeaders: {
      // ...(addBearer ? { Authorization: `Bearer ${access}` } : {}),
      ...(sessionToken ? { 'X-Session-Token': sessionToken } : {}),
      ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      'Accept-Language': localStorage.getItem('lang') || 'ar',
    },
  });
  return next(req);
}
