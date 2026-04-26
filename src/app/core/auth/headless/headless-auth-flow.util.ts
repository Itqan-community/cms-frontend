import { HttpErrorResponse } from '@angular/common/http';
import type { Router } from '@angular/router';
import type { AllauthFlowId, AuthenticationResponse, Flow } from './headless-api.types';

export const AUTH_ROUTES = {
  login: '/login',
  register: '/register',
  verifyEmail: '/verify-email',
  loginByCode: '/login-by-code',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  oauthCallback: '/auth/oauth/callback',
  reauthenticate: '/reauthenticate',
  mfa: '/mfa',
  passkey: '/passkey',
  providerSignup: '/provider-signup',
} as const;

/**
 * Picks the most relevant pending flow for routing, when multiple exist.
 */
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

/**
 * Maps a flow id to an in-app path for initial navigation.
 */
export function getRouteForFlowId(flowId: AllauthFlowId | string | undefined): string | null {
  if (!flowId) {
    return null;
  }
  const map: Partial<Record<string, string>> = {
    verify_email: AUTH_ROUTES.verifyEmail,
    verify_phone: '/verify-phone', // not in main scope; reserved
    login_by_code: AUTH_ROUTES.loginByCode,
    mfa_authenticate: AUTH_ROUTES.mfa,
    provider_signup: AUTH_ROUTES.providerSignup,
  };
  return map[flowId] ?? null;
}

/**
 * True when 401 + meta.is_authenticated + reauth flows (sensitive action blocked).
 */
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

/**
 * Tries to route to the correct screen for a 401 auth response (e.g. verify email, 2FA).
 * Returns true if navigation was performed.
 */
export function tryNavigateForAuth401(router: Router, error: HttpErrorResponse): boolean {
  if (error.status !== 401 || !error.error || typeof error.error !== 'object') {
    return false;
  }
  const auth = error.error as Partial<AuthenticationResponse>;
  if (auth.status !== 401 || !Array.isArray(auth.data?.flows)) {
    return false;
  }
  const pending = getPendingFlow(auth.data.flows);
  if (pending?.id === 'verify_email') {
    void router.navigate([AUTH_ROUTES.verifyEmail]);
    return true;
  }
  if (
    pending?.id === 'mfa_authenticate' ||
    (!pending && auth.data.flows.some((f) => f.id === 'mfa_authenticate'))
  ) {
    void router.navigate([AUTH_ROUTES.mfa]);
    return true;
  }
  if (pending?.id === 'login_by_code') {
    void router.navigate([AUTH_ROUTES.loginByCode], { queryParams: { step: 'confirm' } });
    return true;
  }
  const path = getRouteForFlowId(pending?.id);
  if (path) {
    void router.navigate([path]);
    return true;
  }
  return false;
}
