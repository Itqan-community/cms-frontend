import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Official app-mode headless (`/auth/app/v1`) uses `withCredentials: false`.
 * Other CMS URLs may still rely on cookie sessions when no app token is present.
 */
function isRequestToCmsApi(reqUrl: string): boolean {
  const prefixes = [environment.API_BASE_URL, environment.ADMIN_API_BASE_URL].filter(
    (p): p is string => typeof p === 'string' && p.length > 0
  );
  return prefixes.some((p) => reqUrl.startsWith(p));
}

export function credentialsInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  if (!isRequestToCmsApi(req.url)) {
    return next(req);
  }
  const isAppHeadlessAuth = req.url.includes('/auth/app/v1/');
  return next(req.clone({ withCredentials: !isAppHeadlessAuth }));
}
