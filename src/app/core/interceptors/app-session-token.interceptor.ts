import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  isBackendApiRequestUrl,
  shouldOmitHeadlessSessionTokenForRequest,
} from '../auth/headless/headless-api-path.util';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';

/**
 * Backend API calls (`API_BASE_URL` / `ADMIN_API_BASE_URL`): attach `X-Session-Token`
 * from session store (sessionStorage, with `sessionid` cookie fallback — see {@link HeadlessAppTokenService#getSessionToken}).
 * Omits the header only for anonymous passkey-signup initiate POST — see `shouldOmitHeadlessSessionTokenForRequest`.
 */
export function appSessionTokenInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const store = inject(HeadlessAppTokenService);
  if (!isBackendApiRequestUrl(req.url)) {
    return next(req);
  }
  const t = store.getSessionToken();
  if (!t) {
    return next(req);
  }
  if (shouldOmitHeadlessSessionTokenForRequest(req.url, req.method)) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { 'X-Session-Token': t },
    })
  );
}
