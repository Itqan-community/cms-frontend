import { environment } from '../../../../environments/environment';
import {
  shouldOmitHeadlessSessionTokenForRequest,
  isHeadlessWebauthnLoginUrl,
  isBackendApiRequestUrl,
  isPublicAnonymousCmsRead,
  isAnonymousHeadlessSessionProbe,
} from './headless-api-path.util';

describe('headless-api-path.util', () => {
  const api = environment.API_BASE_URL;
  const adminApi = environment.ADMIN_API_BASE_URL;

  it('isBackendApiRequestUrl matches API_BASE_URL and ADMIN_API_BASE_URL prefixes', () => {
    if (!api || !adminApi) {
      pending('API_BASE_URL / ADMIN_API_BASE_URL');
      return;
    }
    expect(isBackendApiRequestUrl(`${api}/auth/profile/`)).toBe(true);
    expect(isBackendApiRequestUrl(`${adminApi}/x`)).toBe(true);
    expect(isBackendApiRequestUrl(api.substring(1))).toBe(false);
    expect(isBackendApiRequestUrl('https://other.example/')).toBe(false);
  });

  it('isHeadlessWebauthnLoginUrl matches app client login endpoint', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/app/v1/auth/webauthn/login`;
    expect(isHeadlessWebauthnLoginUrl(url)).toBe(true);
    expect(isHeadlessWebauthnLoginUrl(`${api}/auth/profile/`)).toBe(false);
  });

  it('shouldOmitHeadlessSessionTokenForRequest only for passkey signup initiate POST', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const login = `${api}/auth/app/v1/auth/webauthn/login`;
    const signup = `${api}/auth/app/v1/auth/webauthn/signup`;
    const session = `${api}/auth/app/v1/auth/session`;

    expect(shouldOmitHeadlessSessionTokenForRequest(login, 'GET')).toBe(false);
    expect(shouldOmitHeadlessSessionTokenForRequest(login, 'POST')).toBe(false);
    expect(shouldOmitHeadlessSessionTokenForRequest(signup, 'POST')).toBe(true);
    expect(shouldOmitHeadlessSessionTokenForRequest(signup, 'GET')).toBe(false);
    expect(shouldOmitHeadlessSessionTokenForRequest(signup, 'PUT')).toBe(false);
    expect(shouldOmitHeadlessSessionTokenForRequest(session, 'GET')).toBe(false);
  });

  it('isPublicAnonymousCmsRead matches gallery and publisher GET reads only', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    expect(isPublicAnonymousCmsRead(`${api}/assets/`, 'GET')).toBe(true);
    expect(isPublicAnonymousCmsRead(`${api}/assets/?page=1`, 'GET')).toBe(true);
    expect(isPublicAnonymousCmsRead(`${api}/assets/42/`, 'GET')).toBe(true);
    expect(isPublicAnonymousCmsRead(`${api}/publishers/7/`, 'GET')).toBe(true);
    expect(isPublicAnonymousCmsRead(`${api}/assets/42/download/`, 'GET')).toBe(false);
    expect(isPublicAnonymousCmsRead(`${api}/assets/`, 'POST')).toBe(false);
    expect(isPublicAnonymousCmsRead(`${api}/auth/profile/`, 'GET')).toBe(false);
  });

  it('isAnonymousHeadlessSessionProbe matches anonymous session GET envelopes only', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const session = `${api}/auth/app/v1/auth/session`;
    const anonymousBody = {
      status: 401,
      meta: { is_authenticated: false },
      data: { flows: [{ id: 'login' }] },
    };
    expect(isAnonymousHeadlessSessionProbe(session, 'GET', { error: anonymousBody })).toBe(true);
    expect(
      isAnonymousHeadlessSessionProbe(session, 'GET', {
        error: { status: 401, meta: { is_authenticated: true }, data: { flows: [] } },
      })
    ).toBe(false);
    expect(
      isAnonymousHeadlessSessionProbe(`${api}/auth/app/v1/config`, 'GET', { error: anonymousBody })
    ).toBe(false);
  });
});
