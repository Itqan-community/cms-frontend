/** Allauth app client base path under `API_BASE_URL` (X-Session-Token transport). */
export const HEADLESS_APP_AUTH_PATH_FRAGMENT = '/auth/app/v1/';

/** Account WebAuthn enrollment (add passkey while logged in). Reauthentication 401 should be handled on-page, not global redirect. */
export const HEADLESS_ACCOUNT_WEBAUTHN_AUTHENTICATORS_PATH = '/account/authenticators/webauthn';

export function isHeadlessAccountWebAuthnAuthenticatorsUrl(url: string): boolean {
  return url.includes(HEADLESS_ACCOUNT_WEBAUTHN_AUTHENTICATORS_PATH);
}

export function isHeadlessAppAuthUrl(url: string): boolean {
  return url.includes(HEADLESS_APP_AUTH_PATH_FRAGMENT);
}
