import { environment } from '../../../../environments/environment';

/** Allauth app client base path under `API_BASE_URL` (X-Session-Token transport). */
export const HEADLESS_APP_AUTH_PATH_FRAGMENT = '/auth/app/v1/';

/**
 * True when the request targets the configured CMS or admin API base URLs
 * (matches {@link credentialsInterceptor} / global API scope).
 */
export function isBackendApiRequestUrl(reqUrl: string): boolean {
  const prefixes = [environment.API_BASE_URL, environment.ADMIN_API_BASE_URL].filter(
    (p): p is string => typeof p === 'string' && p.length > 0
  );
  return prefixes.some((p) => reqUrl.startsWith(p));
}

/** Account WebAuthn enrollment (add passkey while logged in). Reauthentication 401 should be handled on-page, not global redirect. */
export const HEADLESS_ACCOUNT_WEBAUTHN_AUTHENTICATORS_PATH = '/account/authenticators/webauthn';

export function isHeadlessAccountWebAuthnAuthenticatorsUrl(url: string): boolean {
  return url.includes(HEADLESS_ACCOUNT_WEBAUTHN_AUTHENTICATORS_PATH);
}

/** Passkey login — WebAuthn assertion completion must send `X-Session-Token` from the prior GET options step (same headless stage). */
export const HEADLESS_WEBAUTHN_LOGIN_PATH_FRAGMENT = '/auth/webauthn/login';

export function isHeadlessWebauthnLoginUrl(url: string): boolean {
  return isHeadlessAppAuthUrl(url) && url.includes(HEADLESS_WEBAUTHN_LOGIN_PATH_FRAGMENT);
}

/**
 * `POST /auth/.../webauthn/signup` with `{ email }` only — must be anonymous; a stale `X-Session-Token`
 * can confuse the server. (`GET` / `PUT` on this path still need the token after initiate.)
 */
export function isHeadlessWebauthnSignupInitiatePost(url: string, method: string): boolean {
  return method === 'POST' && isHeadlessAppAuthUrl(url) && url.includes('/auth/webauthn/signup');
}

/**
 * Omit `X-Session-Token` only where a stale token breaks the flow:
 * - `POST` …/auth/webauthn/signup with `{ email }` only (anonymous initiate)
 *
 * Passkey login (`…/auth/webauthn/login`): attach token when present — GET returns `meta.session_token`
 * and POST assertion must include it. Clear stale tokens at UX entry (`PasskeyPage.loginWithPasskey`) before the first GET.
 *
 * All other app headless URLs attach the token when stored.
 */
export function shouldOmitHeadlessSessionTokenForRequest(url: string, method: string): boolean {
  return isHeadlessWebauthnSignupInitiatePost(url, method);
}

export function isHeadlessAppAuthUrl(url: string): boolean {
  return url.includes(HEADLESS_APP_AUTH_PATH_FRAGMENT);
}

/** `GET|DELETE …/auth/app/v1/auth/session` — anonymous calls must not send a stale `X-Session-Token`. */
export function isHeadlessAppSessionUrl(url: string): boolean {
  return isHeadlessAppAuthUrl(url) && url.includes('/auth/session');
}
