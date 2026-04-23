import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Sends cookies on cross-origin requests to the CMS API (session / CSRF for headless auth).
 */
export function credentialsInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const base = environment.API_BASE_URL;
  if (!base || !req.url.startsWith(base)) {
    return next(req);
  }
  return next(
    req.clone({
      withCredentials: true,
    })
  );
}
