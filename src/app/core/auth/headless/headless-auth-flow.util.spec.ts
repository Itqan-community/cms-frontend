import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import type { Flow } from './headless-api.types';
import {
  getPendingFlow,
  isReauthenticationBody,
  tryNavigateForAuth401,
} from './headless-auth-flow.util';

describe('headless-auth-flow.util', () => {
  function stubRouter(): { router: Router; urls: string[] } {
    const urls: string[] = [];
    const router = {
      navigateByUrl: (url: string) => {
        urls.push(url);
        return Promise.resolve(true);
      },
    } as unknown as Router;
    return { router, urls };
  }

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

  it('isReauthenticationBody detects mfa_reauthenticate 401', () => {
    const ok = isReauthenticationBody({
      status: 401,
      meta: { is_authenticated: true },
      data: { flows: [{ id: 'mfa_reauthenticate' }] },
    });
    expect(ok).toBe(true);
  });

  it('tryNavigateForAuth401 navigates for verify_email', () => {
    const { router, urls } = stubRouter();
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
    expect(urls[0]).toBe('/account/verify-email');
  });

  it('tryNavigateForAuth401 navigates for password_reset_by_code', () => {
    const { router, urls } = stubRouter();
    const err = new HttpErrorResponse({
      status: 401,
      error: {
        status: 401,
        data: { flows: [{ id: 'password_reset_by_code', is_pending: true }] },
        meta: { is_authenticated: false },
      },
    });
    const done = tryNavigateForAuth401(router, err);
    expect(done).toBe(true);
    expect(urls[0]).toBe('/account/password/reset/confirm');
  });

  it('tryNavigateForAuth401 does not navigate when password_reset_by_code is listed but not pending', () => {
    const { router, urls } = stubRouter();
    const err = new HttpErrorResponse({
      status: 401,
      error: {
        status: 401,
        data: {
          flows: [{ id: 'reauthenticate' }, { id: 'password_reset_by_code', is_pending: false }],
        },
        meta: { is_authenticated: true },
      },
    });
    const done = tryNavigateForAuth401(router, err);
    expect(done).toBe(false);
    expect(urls.length).toBe(0);
  });

  it('tryNavigateForAuth401 navigates for provider_signup', () => {
    const { router, urls } = stubRouter();
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
    expect(urls[0]).toBe('/account/provider/signup');
  });
});
