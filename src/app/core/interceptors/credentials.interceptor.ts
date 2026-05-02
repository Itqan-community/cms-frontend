import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Official app-mode headless (`/auth/app/v1`) uses `withCredentials: false`.
 * Other CMS URLs may still rely on cookie sessions when no app token is present.
 */
export function credentialsInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const base = environment.API_BASE_URL;
  if (!base || !req.url.startsWith(base)) {
    return next(req);
  }
  const isAppHeadlessAuth = req.url.includes('/auth/app/v1/');
  return next(req.clone({ withCredentials: !isAppHeadlessAuth }));
}
