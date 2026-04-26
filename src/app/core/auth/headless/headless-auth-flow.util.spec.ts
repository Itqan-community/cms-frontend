import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import type { Flow } from './headless-api.types';
import {
  getPendingFlow,
  isReauthenticationBody,
  tryNavigateForAuth401,
} from './headless-auth-flow.util';

describe('headless-auth-flow.util', () => {
  it('getPendingFlow returns first pending', () => {
    const f = getPendingFlow([
      { id: 'login' },
      { id: 'login_by_code', is_pending: true },
    ] as Flow[]);
    expect(f?.id).toBe('login_by_code');
  });

  it('isReauthenticationBody detects reauth 401', () => {
    const ok = isReauthenticationBody({
      status: 401,
      meta: { is_authenticated: true },
      data: { flows: [{ id: 'reauthenticate' }] },
    });
    expect(ok).toBe(true);
  });

  it('tryNavigateForAuth401 navigates for verify_email', () => {
    const calls: { path: string }[] = [];
    const router = {
      navigate: (path: string[]) => {
        calls.push({ path: path[0] ?? '' });
      },
    } as unknown as Router;
    const err = new HttpErrorResponse({
      status: 401,
      error: {
        status: 401,
        data: { flows: [{ id: 'verify_email', is_pending: true }] },
        meta: { is_authenticated: false },
      },
    });
    const done = tryNavigateForAuth401(router, err);
    expect(done).toBe(true);
    expect(calls[0].path).toBe('/verify-email');
  });

  it('tryNavigateForAuth401 navigates for provider_signup', () => {
    const calls: { path: string }[] = [];
    const router = {
      navigate: (path: string[]) => {
        calls.push({ path: path[0] ?? '' });
      },
    } as unknown as Router;
    const err = new HttpErrorResponse({
      status: 401,
      error: {
        status: 401,
        data: { flows: [{ id: 'provider_signup', is_pending: true }] },
        meta: { is_authenticated: false },
      },
    });
    const done = tryNavigateForAuth401(router, err);
    expect(done).toBe(true);
    expect(calls[0].path).toBe('/provider-signup');
  });
});
