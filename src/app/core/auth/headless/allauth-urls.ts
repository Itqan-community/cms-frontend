/**
 * Path suffixes relative to app client base `${API_BASE_URL}/auth/app/v1`.
 * Mirrors `.temp/django-allauth/frontend/src/lib/allauth.js` `URLs`.
 */
export const ALLAUTH_URLS = Object.freeze({
  CONFIG: '/config',
  CHANGE_PASSWORD: '/account/password/change',
  EMAIL: '/account/email',
  PROVIDERS: '/account/providers',
  AUTHENTICATORS: '/account/authenticators',
  RECOVERY_CODES: '/account/authenticators/recovery-codes',
  TOTP_AUTHENTICATOR: '/account/authenticators/totp',
  LOGIN: '/auth/login',
  REQUEST_LOGIN_CODE: '/auth/code/request',
  CONFIRM_LOGIN_CODE: '/auth/code/confirm',
  SESSION: '/auth/session',
  REAUTHENTICATE: '/auth/reauthenticate',
  REQUEST_PASSWORD_RESET: '/auth/password/request',
  RESET_PASSWORD: '/auth/password/reset',
  SIGNUP: '/auth/signup',
  VERIFY_EMAIL: '/auth/email/verify',
  MFA_AUTHENTICATE: '/auth/2fa/authenticate',
  MFA_REAUTHENTICATE: '/auth/2fa/reauthenticate',
  MFA_TRUST: '/auth/2fa/trust',
  PROVIDER_SIGNUP: '/auth/provider/signup',
  REDIRECT_TO_PROVIDER: '/auth/provider/redirect',
  PROVIDER_TOKEN: '/auth/provider/token',
  SESSIONS: '/auth/sessions',
  REAUTHENTICATE_WEBAUTHN: '/auth/webauthn/reauthenticate',
  AUTHENTICATE_WEBAUTHN: '/auth/webauthn/authenticate',
  LOGIN_WEBAUTHN: '/auth/webauthn/login',
  SIGNUP_WEBAUTHN: '/auth/webauthn/signup',
  WEBAUTHN_AUTHENTICATOR: '/account/authenticators/webauthn',
} as const);

/** Official demo User-Agent string used with app client (see allauth.js `request`). */
export const ALLAUTH_APP_USER_AGENT = 'django-allauth example app';

/** django-allauth provider ids for redirect/token endpoints. */
export const ALLAUTH_SOCIAL_PROVIDER_GOOGLE = 'google';
export const ALLAUTH_SOCIAL_PROVIDER_GITHUB = 'github';
