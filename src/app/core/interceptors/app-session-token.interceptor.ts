import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  isHeadlessAppAuthUrl,
  isHeadlessWebauthnLoginUrl,
  isHeadlessWebauthnSignupInitiatePost,
} from '../auth/headless/headless-api-path.util';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';

/**
 * App headless: attach `X-Session-Token` from `meta.session_token` store for `/auth/app/v1/*` only.
 * Skips passkey **login** and passkey signup **initiate** (`POST …/webauthn/signup`); a stale token
 * there skews server state (often `incorrect_code` on the WebAuthn POST).
 */
export function appSessionTokenInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const store = inject(HeadlessAppTokenService);
  const base = environment.API_BASE_URL;
  if (!base || !req.url.startsWith(base) || !isHeadlessAppAuthUrl(req.url)) {
    return next(req);
  }
  const t = store.getSessionToken();
  if (!t) {
    return next(req);
  }
  if (isHeadlessWebauthnLoginUrl(req.url)) {
    return next(req);
  }
  if (isHeadlessWebauthnSignupInitiatePost(req.url, req.method)) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { 'X-Session-Token': t },
    })
  );
}
