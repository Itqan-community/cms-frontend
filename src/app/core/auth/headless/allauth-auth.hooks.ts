import type { Flow, HeadlessUser } from './headless-api.types';

/** Authenticator types — mirrors official `AuthenticatorType`. */
export const AuthenticatorType = Object.freeze({
  TOTP: 'totp',
  RECOVERY_CODES: 'recovery_codes',
  WEBAUTHN: 'webauthn',
} as const);

/** CMS landing — replaces demo `/calculator`. */
export const ALLAUTH_LOGIN_REDIRECT_URL = '/gallery';

/** After logout — keep users on public CMS shell (official demo uses `/`). */
export const ALLAUTH_LOGOUT_REDIRECT_URL = '/gallery';

/** Official SPA login URL shape. */
export const ALLAUTH_LOGIN_URL = '/account/login';

/** Official SPA path for interactive reauthentication step picker. */
export const ALLAUTH_REAUTHENTICATE_URL = '/account/reauthenticate';

export const AuthChangeEvent = Object.freeze({
  LOGGED_OUT: 'LOGGED_OUT',
  LOGGED_IN: 'LOGGED_IN',
  REAUTHENTICATED: 'REAUTHENTICATED',
  REAUTHENTICATION_REQUIRED: 'REAUTHENTICATION_REQUIRED',
  FLOW_UPDATED: 'FLOW_UPDATED',
} as const);

export type AuthChangeEventType = (typeof AuthChangeEvent)[keyof typeof AuthChangeEvent];

/**
 * Pending-flow → path map — mirrors `.temp/django-allauth/frontend/src/auth/routing.js` `flow2path`,
 * except login redirect target uses {@link ALLAUTH_LOGIN_REDIRECT_URL} elsewhere.
 */
const flow2path: Record<string, string> = {};
flow2path['login'] = '/account/login';
flow2path['login_by_code'] = '/account/login/code/confirm';
flow2path['signup'] = '/account/signup';
flow2path['verify_email'] = '/account/verify-email';
flow2path['password_reset_by_code'] = '/account/password/reset/confirm';
flow2path['provider_signup'] = '/account/provider/signup';
flow2path['reauthenticate'] = '/account/reauthenticate';
flow2path['mfa_trust'] = '/account/2fa/trust';
flow2path[`mfa_authenticate:${AuthenticatorType.TOTP}`] = '/account/authenticate/totp';
flow2path[`mfa_authenticate:${AuthenticatorType.RECOVERY_CODES}`] =
  '/account/authenticate/recovery-codes';
flow2path[`mfa_authenticate:${AuthenticatorType.WEBAUTHN}`] = '/account/authenticate/webauthn';
flow2path[`mfa_reauthenticate:${AuthenticatorType.TOTP}`] = '/account/reauthenticate/totp';
flow2path[`mfa_reauthenticate:${AuthenticatorType.RECOVERY_CODES}`] =
  '/account/reauthenticate/recovery-codes';
flow2path[`mfa_reauthenticate:${AuthenticatorType.WEBAUTHN}`] =
  '/account/reauthenticate/webauthn';
flow2path['mfa_signup_webauthn'] = '/account/signup/passkey/create';

export type AuthInfo = {
  isAuthenticated: boolean;
  requiresReauthentication: boolean;
  pendingFlow: Flow | undefined;
  user: HeadlessUser | null;
};

/** Mirrors official `hooks.js` `authInfo`. */
export function authInfo(auth: unknown): AuthInfo {
  if (!auth || typeof auth !== 'object' || !('status' in auth)) {
    return {
      isAuthenticated: false,
      requiresReauthentication: false,
      pendingFlow: undefined,
      user: null,
    };
  }
  const a = auth as {
    status: number;
    meta?: { is_authenticated?: boolean };
    data?: { flows?: Flow[]; user?: HeadlessUser; methods?: unknown[] };
  };
  const isAuthenticated =
    a.status === 200 || (a.status === 401 && a.meta?.is_authenticated === true);
  const requiresReauthentication = isAuthenticated && a.status === 401;
  const pendingFlow = a.data?.flows?.find((flow) => flow.is_pending);
  const user =
    isAuthenticated && a.data?.user !== undefined ? (a.data.user ?? null) : null;
  return { isAuthenticated, requiresReauthentication, pendingFlow, user };
}

export function pathForFlow(flow: Flow, typ?: string): string {
  let key: string = flow.id;
  if (typeof flow.types !== 'undefined') {
    const t = typ ?? flow.types[0];
    key = `${flow.id}:${t}`;
  }
  const path = flow2path[key] ?? flow2path[flow.id];
  if (!path) {
    throw new Error(`Unknown path for flow: ${flow.id}`);
  }
  return path;
}

export function pathForPendingFlow(auth: unknown): string | null {
  const info = authInfo(auth);
  const flows = (auth as { data?: { flows?: Flow[] } })?.data?.flows;
  if (!flows?.length) {
    return null;
  }
  const pending = flows.find((flow) => flow.is_pending);
  if (!pending) {
    return null;
  }
  return pathForFlow(pending);
}

/** Mirrors official `determineAuthChangeEvent(fromAuth, toAuth)`. */
export function determineAuthChangeEvent(
  fromAuth: unknown,
  toAuth: unknown
): AuthChangeEventType | null {
  let fromInfo = authInfo(fromAuth);
  const toInfo = authInfo(toAuth as unknown);

  const toEnvelope = toAuth as { status?: number; data?: { methods?: unknown[] } };
  if (toEnvelope.status === 410) {
    return AuthChangeEvent.LOGGED_OUT;
  }

  if (fromInfo.user && toInfo.user && fromInfo.user?.id !== toInfo.user?.id) {
    fromInfo = {
      isAuthenticated: false,
      requiresReauthentication: false,
      pendingFlow: undefined,
      user: null,
    };
  }

  if (!fromInfo.isAuthenticated && toInfo.isAuthenticated) {
    return AuthChangeEvent.LOGGED_IN;
  }
  if (fromInfo.isAuthenticated && !toInfo.isAuthenticated) {
    return AuthChangeEvent.LOGGED_OUT;
  }
  if (fromInfo.isAuthenticated && toInfo.isAuthenticated) {
    if (toInfo.requiresReauthentication) {
      return AuthChangeEvent.REAUTHENTICATION_REQUIRED;
    }
    if (fromInfo.requiresReauthentication) {
      return AuthChangeEvent.REAUTHENTICATED;
    }
    const fromMethods =
      (fromAuth as { data?: { methods?: unknown[] } })?.data?.methods ?? [];
    const toMethods = toEnvelope.data?.methods ?? [];
    if (fromMethods.length < toMethods.length) {
      return AuthChangeEvent.REAUTHENTICATED;
    }
  } else if (!fromInfo.isAuthenticated && !toInfo.isAuthenticated) {
    const fromFlow = fromInfo.pendingFlow;
    const toFlow = toInfo.pendingFlow;
    if (toFlow?.id && fromFlow?.id !== toFlow.id) {
      return AuthChangeEvent.FLOW_UPDATED;
    }
  }
  return null;
}
