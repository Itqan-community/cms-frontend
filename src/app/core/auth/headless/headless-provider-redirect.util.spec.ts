import { HEADLESS_CLIENT_APP } from './headless-api.types';
import { ALLAUTH_URLS } from './allauth-urls';
import {
  buildHeadlessProviderRedirectPostUrl,
  startHeadlessProviderRedirect,
} from './headless-provider-redirect.util';

describe('headless-provider-redirect.util', () => {
  it('buildHeadlessProviderRedirectPostUrl targets app client redirect path', () => {
    expect(buildHeadlessProviderRedirectPostUrl('https://api.example/cms-api')).toBe(
      `https://api.example/cms-api/auth/${HEADLESS_CLIENT_APP}/v1${ALLAUTH_URLS.REDIRECT_TO_PROVIDER}`
    );
    expect(buildHeadlessProviderRedirectPostUrl('https://api.example/cms-api/')).toBe(
      `https://api.example/cms-api/auth/${HEADLESS_CLIENT_APP}/v1${ALLAUTH_URLS.REDIRECT_TO_PROVIDER}`
    );
  });

  it('returns redirect location when fetch returns 302 with Location', async () => {
    const fetchFn = jasmine.createSpy('fetch').and.returnValue(
      Promise.resolve({
        type: 'basic',
        status: 302,
        headers: new Headers({ Location: 'https://provider.example/oauth' }),
      } as Response)
    );
    const result = await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'login',
      callbackUrl: 'https://app.example/account/provider/callback',
      fetchFn,
      windowRef: {} as Window & typeof globalThis,
    });
    expect(result).toEqual({ kind: 'redirect', location: 'https://provider.example/oauth' });
    expect(fetchFn).toHaveBeenCalled();
  });

  it('returns json kind when response is application/json', async () => {
    const fetchFn = jasmine.createSpy('fetch').and.returnValue(
      Promise.resolve({
        type: 'basic',
        status: 401,
        ok: false,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => Promise.resolve({ status: 401, data: { flows: [] }, meta: {} }),
      } as unknown as Response)
    );
    const result = await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'login',
      callbackUrl: 'https://app.example/account/provider/callback',
      fetchFn,
      windowRef: {} as Window & typeof globalThis,
    });
    expect(result.kind).toBe('json');
    if (result.kind === 'json') {
      expect((result.body as { status: number }).status).toBe(401);
    }
  });

  it('returns explicit error for connect flow on opaque cross-origin redirect', async () => {
    const fetchFn = jasmine.createSpy('fetch').and.returnValue(
      Promise.resolve({
        type: 'opaqueredirect',
        status: 0,
        headers: new Headers(),
      } as unknown as Response)
    );
    const result = await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'connect',
      callbackUrl: 'https://app.example/account/provider/callback',
      sessionToken: 'sess-1',
      fetchFn,
      windowRef: {} as Window & typeof globalThis,
    });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('cross-origin API');
    }
  });
});
