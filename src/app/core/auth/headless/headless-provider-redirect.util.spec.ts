import { HEADLESS_CLIENT_BROWSER } from './headless-api.types';
import { ALLAUTH_URLS } from './allauth-urls';
import {
  buildHeadlessProviderRedirectPostUrl,
  startHeadlessProviderRedirect,
} from './headless-provider-redirect.util';

describe('headless-provider-redirect.util', () => {
  let submitSpy: jasmine.Spy;

  beforeEach(() => {
    submitSpy = spyOn(HTMLFormElement.prototype, 'submit').and.stub();
  });

  it('buildHeadlessProviderRedirectPostUrl targets browser client redirect path', () => {
    expect(buildHeadlessProviderRedirectPostUrl('https://api.example/cms-api')).toBe(
      `https://api.example/cms-api/auth/${HEADLESS_CLIENT_BROWSER}/v1${ALLAUTH_URLS.REDIRECT_TO_PROVIDER}`
    );
    expect(buildHeadlessProviderRedirectPostUrl('https://api.example/cms-api/')).toBe(
      `https://api.example/cms-api/auth/${HEADLESS_CLIENT_BROWSER}/v1${ALLAUTH_URLS.REDIRECT_TO_PROVIDER}`
    );
  });

  it('login submits navigational form POST (never fetch)', async () => {
    const fetchFn = jasmine.createSpy('fetch');
    const result = await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'login',
      callbackUrl: 'https://app.example/account/provider/callback',
      fetchFn,
    });
    expect(result).toEqual({ kind: 'form_submitted' });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(submitSpy).toHaveBeenCalled();
  });

  it('connect includes csrfmiddlewaretoken in fetch body when provided', async () => {
    const fetchFn = jasmine.createSpy('fetch').and.returnValue(
      Promise.resolve({
        type: 'basic',
        status: 302,
        headers: new Headers({ Location: 'https://provider.example/oauth' }),
      } as Response)
    );
    await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'connect',
      callbackUrl: 'https://app.example/account/provider/callback',
      sessionToken: 'sess-1',
      csrfMiddlewareToken: 'csrf-test',
      fetchFn,
      windowRef: {} as Window & typeof globalThis,
    });
    expect(fetchFn).toHaveBeenCalled();
    expect(submitSpy).not.toHaveBeenCalled();
    const init = fetchFn.calls.mostRecent().args[1] as {
      credentials?: RequestCredentials;
      headers?: Record<string, string>;
      body?: string;
    };
    expect(init.credentials).toBe('include');
    expect(init.body ?? '').toContain('csrfmiddlewaretoken=csrf-test');
    expect(init.headers?.['X-Session-Token']).toBe('sess-1');
  });

  it('connect returns redirect location when fetch returns 302 with Location', async () => {
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
      process: 'connect',
      callbackUrl: 'https://app.example/account/provider/callback',
      sessionToken: 'sess-2',
      fetchFn,
      windowRef: {} as Window & typeof globalThis,
    });
    expect(result).toEqual({ kind: 'redirect', location: 'https://provider.example/oauth' });
    expect(fetchFn).toHaveBeenCalledWith(
      buildHeadlessProviderRedirectPostUrl('https://api.example/cms-api'),
      jasmine.objectContaining({ redirect: 'manual', credentials: 'include' }),
    );
  });

  it('connect returns json kind when response is application/json', async () => {
    const fetchFn = jasmine.createSpy('fetch').and.returnValue(
      Promise.resolve({
        type: 'basic',
        status: 401,
        ok: false,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => Promise.resolve({ status: 401, data: { flows: [] }, meta: {} }),
      } as unknown as Response),
    );
    const result = await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'connect',
      callbackUrl: 'https://app.example/account/provider/callback',
      sessionToken: 'sess-x',
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
      } as unknown as Response),
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

  it('connect without fetch or window returns error', async () => {
    const result = await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'connect',
      callbackUrl: 'https://app.example/account/provider/callback',
      sessionToken: 't',
      fetchFn: undefined,
      windowRef: undefined,
    });
    expect(result.kind).toBe('error');
  });
});
