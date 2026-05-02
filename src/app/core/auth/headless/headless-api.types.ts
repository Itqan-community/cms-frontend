/**
 * Types aligned with django-allauth headless OpenAPI.
 * @see .temp/auth api contract.json
 */

export const HEADLESS_CLIENT_BROWSER = 'browser' as const;
/** App client: `/auth/{client}/v1/...` + `X-Session-Token` for auth, Bearer for other APIs. */
export const HEADLESS_CLIENT_APP = 'app' as const;

export type AllauthFlowId =
  | 'login'
  | 'signup'
  | 'login_by_code'
  | 'mfa_authenticate'
  | 'mfa_reauthenticate'
  | 'mfa_signup_webauthn'
  | 'mfa_trust'
  | 'password_reset_by_code'
  | 'provider_redirect'
  | 'provider_signup'
  | 'provider_token'
  | 'reauthenticate'
  | 'verify_email'
  | 'verify_phone';

export interface AllauthErrorItem {
  code?: string;
  param?: string;
  message: string;
}

export interface AuthenticationMeta {
  is_authenticated: boolean;
  /** App client (non-browser); not used in browser cookie mode. */
  session_token?: string;
  /** Optional; pluggable token strategy. Browser mode uses the Django session (`sessionid`) + CSRF. */
  access_token?: string;
  /** When `HEADLESS_TOKEN_STRATEGY` issues JWT; persist for `/auth/app/v1/tokens/refresh`. */
  refresh_token?: string;
}

/** `POST /auth/app/v1/tokens/refresh` success (contract). */
export interface AppTokenRefreshResponse {
  status: 200;
  data: {
    access_token: string;
    refresh_token?: string;
  };
}

export interface HeadlessUser {
  id: number;
  display: string;
  email?: string;
  has_usable_password: boolean;
}

export interface Flow {
  id: AllauthFlowId;
  is_pending?: true;
  providers?: string[];
  types?: string[];
  provider?: unknown;
}

export interface AuthenticationResponseBody {
  flows: Flow[];
}

export interface AuthenticationResponse {
  status: 401;
  data: AuthenticationResponseBody;
  meta: AuthenticationMeta;
}

export interface ReauthenticationResponseBody {
  user: HeadlessUser;
  methods: unknown[];
  flows: { id: string }[];
}

export interface ReauthenticationResponse {
  status: 401;
  data: ReauthenticationResponseBody;
  meta: { is_authenticated: true };
}

export interface ErrorResponse {
  status: 400;
  errors: AllauthErrorItem[];
}

export type AuthFailure = AuthenticationResponse | ReauthenticationResponse | ErrorResponse;

export interface AuthenticatedPayload {
  user: HeadlessUser;
  methods: unknown[];
}

export interface AuthenticatedResponse {
  status: 200;
  data: AuthenticatedPayload;
  meta: AuthenticationMeta;
}

export interface StatusOkResponse {
  status: 200;
}

export interface WebAuthnCredentialRequestData {
  request_options: {
    publicKey: unknown;
  };
}

/**
 * Envelope returned for **credential creation** (e.g. `GET .../account/authenticators/webauthn`).
 * OpenAPI uses `creation_options` for `parseCreationOptionsFromJSON()`; older shapes used `request_options.publicKey`.
 */
export interface WebAuthnCredentialCreationData {
  creation_options?: unknown;
  request_options?: {
    publicKey?: unknown;
  };
}

export interface WebAuthnRequestOptionsResponse {
  status: 200;
  data: WebAuthnCredentialRequestData;
}

export interface WebAuthnCreationOptionsResponse {
  status: 200;
  data: WebAuthnCredentialCreationData;
}

/** `POST /auth/.../webauthn/signup` initiate body (OpenAPI `PasskeySignup`). */
export interface PasskeySignup {
  email: string;
}

export type ProviderProcess = 'login' | 'connect';

export interface ConfigurationResponse {
  status: 200;
  data: {
    account: {
      authentication_method: string;
      is_open_for_signup: boolean;
      email_verification_by_code_enabled: boolean;
      login_by_code_enabled: boolean;
      password_reset_by_code_enabled?: boolean;
    };
    /** If present, value for `X-CSRFToken` when the SPA and API are on different origins. */
    csrf_token?: string;
    socialaccount?: {
      providers: { id: string; name: string; flows: string[] }[];
    };
    mfa?: { supported_types: string[] };
  };
  meta?: { csrf_token?: string };
}

/** `GET /account/authenticators` */
export type AuthenticatorListItem =
  | { type: 'totp'; created_at: string; last_used_at: string | null }
  | {
      type: 'recovery_codes';
      created_at: string;
      last_used_at: string | null;
      total_code_count: number;
      unused_code_count: number;
    }
  | {
      type: 'webauthn';
      id: string;
      name: string;
      created_at: string;
      last_used_at: string | null;
      is_passwordless?: boolean;
    };

export interface AuthenticatorsListResponse {
  status: 200;
  data: AuthenticatorListItem[];
}

/** `GET /account/authenticators/totp` when TOTP is active */
export interface TotpActiveResponse {
  status: 200;
  data: { type: 'totp'; created_at: string; last_used_at: string | null };
  meta?: { recovery_codes_generated?: boolean };
}

/** `GET /account/authenticators/totp` when not configured (HTTP 404 body) */
export interface TotpPendingResponseBody {
  status: 404;
  meta: { secret: string; totp_url: string };
}

export type TotpStatusResult =
  | { kind: 'active'; data: TotpActiveResponse['data']; meta?: TotpActiveResponse['meta'] }
  | { kind: 'pending_setup'; meta: { secret: string; totp_url: string } };

/** `GET`/`POST /account/authenticators/recovery-codes` success */
export interface RecoveryCodesResponse {
  status: 200;
  data: {
    type: 'recovery_codes';
    total_code_count: number;
    unused_code_count: number;
    unused_codes: string[];
    created_at?: string;
    last_used_at?: string | null;
  };
}
