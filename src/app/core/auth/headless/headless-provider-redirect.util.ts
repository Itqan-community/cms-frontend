import { ALLAUTH_APP_USER_AGENT, ALLAUTH_URLS } from './allauth-urls';
import { HEADLESS_CLIENT_APP } from './headless-api.types';

export type ProviderRedirectProcess = 'login' | 'connect';

export type ProviderRedirectResult =
  | { kind: 'redirect'; location: string }
  | { kind: 'json'; body: unknown }
  | { kind: 'form_submitted' }
  | { kind: 'error'; message: string };

/** Builds POST URL for django-allauth headless `RedirectToProviderView` (form body, not JSON). */
export function buildHeadlessProviderRedirectPostUrl(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, '');
  return `${base}/auth/${HEADLESS_CLIENT_APP}/v1${ALLAUTH_URLS.REDIRECT_TO_PROVIDER}`;
}

export function submitHeadlessProviderRedirectForm(
  actionUrl: string,
  fields: Record<string, string>
): void {
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc?.body) {
    throw new Error('DOM unavailable');
  }
  const form = doc.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';
  for (const [k, v] of Object.entries(fields)) {
    const input = doc.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  doc.body.appendChild(form);
  form.submit();
}

/**
 * Starts OAuth redirect using the same mechanics as official `allauth.js` `postForm`:
 * `application/x-www-form-urlencoded` POST (django `RedirectToProviderForm` reads `request.POST`).
 *
 * Uses `fetch(..., redirect: 'manual')` when possible so `Location` can be read on **same-origin**
 * API URLs. Falls back to a real HTML form POST when the redirect is opaque (typical cross-origin
 * dev setups); connect flows that require `X-Session-Token` cannot use that fallback.
 */
export async function startHeadlessProviderRedirect(opts: {
  apiBaseUrl: string;
  provider: string;
  process: ProviderRedirectProcess;
  callbackUrl: string;
  /** Set for `process: 'connect'` only — sent as `X-Session-Token`. */
  sessionToken?: string | null;
  windowRef?: Window & typeof globalThis;
  fetchFn?: typeof fetch;
}): Promise<ProviderRedirectResult> {
  const win = opts.windowRef ?? (typeof window !== 'undefined' ? window : undefined);
  const fetchFn =
    opts.fetchFn ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
  const actionUrl = buildHeadlessProviderRedirectPostUrl(opts.apiBaseUrl);

  const fields: Record<string, string> = {
    provider: opts.provider,
    process: opts.process,
    callback_url: opts.callbackUrl,
  };

  const body = new URLSearchParams(fields);

  if (!fetchFn || !win) {
    submitHeadlessProviderRedirectForm(actionUrl, fields);
    return { kind: 'form_submitted' };
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': ALLAUTH_APP_USER_AGENT,
  };
  if (opts.sessionToken) {
    headers['X-Session-Token'] = opts.sessionToken;
  }

  let resp: Response;
  try {
    resp = await fetchFn(actionUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
      redirect: 'manual',
      credentials: 'omit',
    });
  } catch (e: unknown) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }

  if (resp.type === 'opaqueredirect') {
    if (!opts.sessionToken) {
      submitHeadlessProviderRedirectForm(actionUrl, fields);
      return { kind: 'form_submitted' };
    }
    return {
      kind: 'error',
      message:
        'Could not read OAuth redirect (cross-origin API). Use same-origin API URL or a reverse proxy, or connect accounts from an environment where the SPA and API share an origin.',
    };
  }

  if (resp.status >= 300 && resp.status < 400) {
    const loc = resp.headers.get('Location');
    if (loc) {
      return { kind: 'redirect', location: loc };
    }
    return { kind: 'error', message: 'Redirect response missing Location header.' };
  }

  const ct = resp.headers.get('Content-Type') ?? '';
  if (ct.includes('application/json')) {
    try {
      const json: unknown = await resp.json();
      return { kind: 'json', body: json };
    } catch {
      return { kind: 'error', message: 'Invalid JSON from provider redirect endpoint.' };
    }
  }

  if (!resp.ok) {
    return {
      kind: 'error',
      message: `Provider redirect failed (HTTP ${resp.status}).`,
    };
  }

  return { kind: 'error', message: 'Unexpected response from provider redirect endpoint.' };
}
