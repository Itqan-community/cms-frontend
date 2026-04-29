import { environment } from '../../../../environments/environment';
import {
  shouldOmitHeadlessSessionTokenForRequest,
  isHeadlessWebauthnLoginUrl,
} from './headless-api-path.util';

describe('headless-api-path.util', () => {
  const api = environment.API_BASE_URL;

  it('isHeadlessWebauthnLoginUrl matches app client login endpoint', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/app/v1/auth/webauthn/login`;
    expect(isHeadlessWebauthnLoginUrl(url)).toBe(true);
    expect(isHeadlessWebauthnLoginUrl(`${api}/auth/profile/`)).toBe(false);
  });

  it('shouldOmitHeadlessSessionTokenForRequest for login GET/POST and signup POST only', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const login = `${api}/auth/app/v1/auth/webauthn/login`;
    const signup = `${api}/auth/app/v1/auth/webauthn/signup`;
    const session = `${api}/auth/app/v1/auth/session`;

    expect(shouldOmitHeadlessSessionTokenForRequest(login, 'GET')).toBe(true);
    expect(shouldOmitHeadlessSessionTokenForRequest(login, 'POST')).toBe(true);
    expect(shouldOmitHeadlessSessionTokenForRequest(signup, 'POST')).toBe(true);
    expect(shouldOmitHeadlessSessionTokenForRequest(signup, 'GET')).toBe(false);
    expect(shouldOmitHeadlessSessionTokenForRequest(signup, 'PUT')).toBe(false);
    expect(shouldOmitHeadlessSessionTokenForRequest(session, 'GET')).toBe(false);
  });
});
