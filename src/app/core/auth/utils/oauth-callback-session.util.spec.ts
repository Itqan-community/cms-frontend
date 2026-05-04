import type { AuthenticatedOrChallenge } from '../headless/headless-auth-api.service';
import { isOauthReturnSessionEstablished } from './oauth-callback-session.util';

describe('oauth-callback-session.util', () => {
  it('is false when no user in envelope', () => {
    const res = {
      status: 200,
      meta: { is_authenticated: false },
      data: { methods: [] },
    } as unknown as AuthenticatedOrChallenge;
    expect(isOauthReturnSessionEstablished(res)).toBe(false);
  });

  it('is true for 200 with user', () => {
    const res = {
      status: 200,
      meta: { is_authenticated: true },
      data: { user: { id: 1 }, methods: [] },
    } as unknown as AuthenticatedOrChallenge;
    expect(isOauthReturnSessionEstablished(res)).toBe(true);
  });

  it('is true for 401 with meta.is_authenticated and user (headless continuation)', () => {
    const res = {
      status: 401,
      meta: { is_authenticated: true },
      data: { user: { id: 2 }, flows: [], methods: [] },
    } as unknown as AuthenticatedOrChallenge;
    expect(isOauthReturnSessionEstablished(res)).toBe(true);
  });

  it('is false for 401 authenticated without user', () => {
    const res = {
      status: 401,
      meta: { is_authenticated: true },
      data: { flows: [], methods: [] },
    } as unknown as AuthenticatedOrChallenge;
    expect(isOauthReturnSessionEstablished(res)).toBe(false);
  });
});
