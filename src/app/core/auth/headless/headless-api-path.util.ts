/** Allauth app client base path under `API_BASE_URL` (X-Session-Token transport). */
export const HEADLESS_APP_AUTH_PATH_FRAGMENT = '/auth/app/v1/';

/** Account WebAuthn enrollment (add passkey while logged in). Reauthentication 401 should be handled on-page, not global redirect. */
export const HEADLESS_ACCOUNT_WEBAUTHN_AUTHENTICATORS_PATH = '/account/authenticators/webauthn';

export function isHeadlessAccountWebAuthnAuthenticatorsUrl(url: string): boolean {
  return url.includes(HEADLESS_ACCOUNT_WEBAUTHN_AUTHENTICATORS_PATH);
}

/** Passkey login from logged-out UX: must not send a stale `X-Session-Token` or the server may expect a different step (often `incorrect_code`). */
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

export function isHeadlessAppAuthUrl(url: string): boolean {
  return url.includes(HEADLESS_APP_AUTH_PATH_FRAGMENT);
}
