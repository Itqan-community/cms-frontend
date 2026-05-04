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
    const result = await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'login',
      callbackUrl: 'https://app.example/account/provider/callback',
    });
    expect(result).toEqual({ kind: 'form_submitted' });
    expect(submitSpy).toHaveBeenCalled();
  });

  it('connect submits the same navigational form POST as login', async () => {
    const result = await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'connect',
      callbackUrl: 'https://app.example/account/provider/callback',
      csrfMiddlewareToken: 'csrf-test',
    });
    expect(result).toEqual({ kind: 'form_submitted' });
    expect(submitSpy).toHaveBeenCalled();
  });

  it('includes csrfmiddlewaretoken in form hidden fields when provided', async () => {
    const createEl = spyOn(document, 'createElement').and.callThrough();
    await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'github',
      process: 'connect',
      callbackUrl: 'https://app.example/cb',
      csrfMiddlewareToken: 'csrf-inline',
    });

    const inputs = createEl.calls
      .all()
      .map((c) => c.returnValue)
      .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement);
    const pairs = Object.fromEntries(inputs.map((el) => [el.name, el.value]));
    expect(pairs['csrfmiddlewaretoken']).toBe('csrf-inline');
    expect(pairs['process']).toBe('connect');
    expect(pairs['provider']).toBe('github');
    expect(pairs['callback_url']).toBe('https://app.example/cb');
  });

  it('returns error when document.body is unavailable', async () => {
    const bodySpy = spyOnProperty(document, 'body', 'get').and.returnValue(
      null as unknown as HTMLBodyElement,
    );
    const result = await startHeadlessProviderRedirect({
      apiBaseUrl: 'https://api.example/cms-api',
      provider: 'google',
      process: 'login',
      callbackUrl: 'https://app.example/cb',
    });
    expect(result.kind).toBe('error');
    bodySpy.and.callThrough();
  });
});
