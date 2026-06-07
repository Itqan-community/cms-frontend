import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isBackendApiRequestUrl } from '../auth/headless/headless-api-path.util';

/**
 * Official app-mode headless (`/auth/app/v1`) uses `withCredentials: false`.
 * Other CMS URLs may still rely on cookie sessions when no app token is present.
 */
export function credentialsInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  if (!isBackendApiRequestUrl(req.url)) {
    return next(req);
  }
  const isAppHeadlessAuth = req.url.includes('/auth/app/v1/');
  return next(req.clone({ withCredentials: !isAppHeadlessAuth }));
}
