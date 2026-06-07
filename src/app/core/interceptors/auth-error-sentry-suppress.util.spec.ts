import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { shouldSuppressSentryForHeadlessHttpError } from './auth-error-sentry-suppress.util';

describe('shouldSuppressSentryForHeadlessHttpError', () => {
  const api = environment.API_BASE_URL;

  it('is true for 409 unverified_email on headless app URL', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/app/v1/account/authenticators/totp`;
    const err = new HttpErrorResponse({
      status: 409,
      url,
      error: {
        status: 409,
        errors: [{ code: 'unverified_email', message: 'm' }],
      },
    });
    expect(shouldSuppressSentryForHeadlessHttpError(url, 'GET', err)).toBe(true);
  });

  it('is false for unverified_email on non-headless URL', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/profile/`;
    const err = new HttpErrorResponse({
      status: 409,
      error: {
        status: 409,
        errors: [{ code: 'unverified_email', message: 'm' }],
      },
    });
    expect(shouldSuppressSentryForHeadlessHttpError(url, 'GET', err)).toBe(false);
  });

  it('is false for other 409 on headless URL', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/app/v1/account/authenticators/totp`;
    const err = new HttpErrorResponse({
      status: 409,
      error: { status: 409, errors: [{ code: 'other', message: 'x' }] },
    });
    expect(shouldSuppressSentryForHeadlessHttpError(url, 'GET', err)).toBe(false);
  });

  it('is true for GET …/authenticators/totp HTTP 404 (not enrolled probe)', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/app/v1/account/authenticators/totp`;
    const err = new HttpErrorResponse({ status: 404, error: {}, url });
    expect(shouldSuppressSentryForHeadlessHttpError(url, 'GET', err)).toBe(true);
  });

  it('is false for GET …/authenticators/totp 404 from non-headless CMS URL', () => {
    expect(
      shouldSuppressSentryForHeadlessHttpError(
        'https://evil.example/account/authenticators/totp',
        'GET',
        new HttpErrorResponse({ status: 404 })
      )
    ).toBe(false);
  });

  it('is false for POST …/authenticators/totp HTTP 404', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/app/v1/account/authenticators/totp`;
    const err = new HttpErrorResponse({ status: 404 });
    expect(shouldSuppressSentryForHeadlessHttpError(url, 'POST', err)).toBe(false);
  });
});
