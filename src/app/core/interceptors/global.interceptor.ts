import { HttpEvent, HttpRequest } from '@angular/common/http';
import { HttpHandlerFn } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { getDjangoCsrfTokenForRequest, isUnsafeHttpMethod } from '../utils/csrf.util';

/**
 * Browser cross-origin credentialed calls to Django require CSRF for unsafe methods
 * using a token from GET /config JSON (cross-origin) or the `csrftoken` cookie (same-origin).
 * @see https://docs.djangoproject.com/en/stable/ref/csrf/
 */
export function headersInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const isApi = req.url.startsWith(environment.API_BASE_URL);
  const csrf = isApi && isUnsafeHttpMethod(req.method) ? getDjangoCsrfTokenForRequest() : null;

  req = req.clone({
    setHeaders: {
      // Browser mode auth: rely on `sessionid` cookie via `withCredentials`, not Bearer.
      ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      'Accept-Language': localStorage.getItem('lang') || 'ar',
    },
  });
  return next(req);
}
