import { HttpErrorResponse } from '@angular/common/http';
import type { Router } from '@angular/router';
import type { AllauthFlowId, AuthenticationResponse, Flow } from './headless-api.types';
import { pathForFlow } from './allauth-auth.hooks';

/** Legacy CMS shortcuts → official `/account/...` routes */
export const AUTH_ROUTES = {
  login: '/account/login',
  register: '/account/signup',
  verifyEmail: '/account/verify-email',
  loginByCode: '/account/login/code',
  forgotPassword: '/account/password/reset',
  resetPassword: '/account/password/reset/complete',
  oauthCallback: '/account/provider/callback',
  reauthenticate: '/account/reauthenticate',
  mfaTotp: '/account/authenticate/totp',
  passkey: '/account/signup/passkey',
  providerSignup: '/account/provider/signup',
} as const;

/**
 * Aliases for `settings.HEADLESS_FRONTEND_URLS` paths (BE email links).
 */
export const AUTH_ROUTES_HEADLESS = {
  accountConfirmEmail: (key: string) => `/accounts/confirm-email/${key}`,
  accountPasswordReset: '/account/password/reset',
  accountPasswordResetKey: (key: string) => `/account/password/reset/key/${key}`,
  accountSignup: '/account/signup',
  socialProviderCallback: '/account/provider/callback',
} as const;

/** True when password reset-by-code is **actively pending** (`is_pending: true`). */
export function isPasswordResetByCodePending(flows: Flow[] | undefined): boolean {
  if (!flows?.length) {
    return false;
  }
  return flows.some((f) => f.id === 'password_reset_by_code' && f.is_pending === true);
}

/** Picks the most relevant pending flow for routing, when multiple exist. */
export function getPendingFlow(flows: Flow[] | undefined): Flow | null {
  if (!flows?.length) {
    return null;
  }
  const pending = flows.filter((f) => f.is_pending);
  if (pending.length) {
    return pending[0] ?? null;
  }
  return null;
}

/** Fallback map when `pathForFlow` cannot derive path from incomplete flow metadata. */
export function getRouteForFlowId(flowId: AllauthFlowId | string | undefined): string | null {
  if (!flowId) {
    return null;
  }
  const map: Partial<Record<string, string>> = {
    verify_email: AUTH_ROUTES.verifyEmail,
    verify_phone: '/verify-phone',
    login_by_code: '/account/login/code/confirm',
    mfa_authenticate: '/account/authenticate/totp',
    provider_signup: AUTH_ROUTES.providerSignup,
    password_reset_by_code: '/account/password/reset/confirm',
  };
  return map[flowId] ?? null;
}

/** True when 401 + meta.is_authenticated + reauth flows (sensitive action blocked). */
export function isReauthenticationBody(body: unknown): body is {
  status: 401;
  data: { flows?: { id: string }[] };
  meta: { is_authenticated: boolean };
} {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const o = body as {
    status?: number;
    meta?: { is_authenticated?: boolean };
    data?: { flows?: { id: string }[] };
  };
  if (o.status !== 401) {
    return false;
  }
  if (o.meta?.is_authenticated !== true) {
    return false;
  }
  return (
    Array.isArray(o.data?.flows) &&
    o.data!.flows!.some((f) => f.id === 'reauthenticate' || f.id === 'mfa_reauthenticate')
  );
}

/** Navigate using official pending-flow mapping where possible. */
export function tryNavigateForAuth401(router: Router, error: HttpErrorResponse): boolean {
  if (error.status !== 401 || !error.error || typeof error.error !== 'object') {
    return false;
  }
  const auth = error.error as Partial<AuthenticationResponse>;
  if (auth.status !== 401 || !Array.isArray(auth.data?.flows)) {
    return false;
  }
  const pending = getPendingFlow(auth.data.flows);
  if (pending) {
    try {
      void router.navigateByUrl(pathForFlow(pending));
      return true;
    } catch {
      /* fall through */
    }
  }
  const fallbackId =
    pending?.id ??
    auth.data.flows.find((f) => f.id === 'mfa_authenticate')?.id ??
    auth.data.flows[0]?.id;
  const path = getRouteForFlowId(fallbackId);
  if (path) {
    void router.navigateByUrl(path);
    return true;
  }
  return false;
}
