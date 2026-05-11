import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { getDjangoCsrfTokenForRequest, isUnsafeHttpMethod } from '../utils/csrf.util';

/**
 * CMS/product APIs under `API_BASE_URL` / `ADMIN_API_BASE_URL`: CSRF and language headers.
 * `X-Session-Token` is attached only by {@link appSessionTokenInterceptor}.
 */
export function headersInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const api = environment.API_BASE_URL;
  const adminApi = environment.ADMIN_API_BASE_URL;
  const isApi = (api && req.url.startsWith(api)) || (adminApi && req.url.startsWith(adminApi));
  // const isAppAuth = isHeadlessAppAuthUrl(req.url);
  // const access = tokenStore.getAccessToken();

  // const addBearer = isApi && !isAppAuth && !!access;

  const useCsrf = isApi && isUnsafeHttpMethod(req.method); /* && !isAppAuth && !addBearer */

  const csrf = useCsrf ? getDjangoCsrfTokenForRequest() : null;

  req = req.clone({
    setHeaders: {
      // ...(addBearer ? { Authorization: `Bearer ${access}` } : {}),
      ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      'Accept-Language': localStorage.getItem('lang') || 'ar',
    },
  });
  return next(req);
}
