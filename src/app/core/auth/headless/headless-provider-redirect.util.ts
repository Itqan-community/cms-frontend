import { getDjangoCsrfTokenForRequest } from '../../utils/csrf.util';
import { ALLAUTH_URLS } from './allauth-urls';
import { HEADLESS_CLIENT_BROWSER } from './headless-api.types';

export type ProviderRedirectProcess = 'login' | 'connect';

export type ProviderRedirectResult =
  | { kind: 'json'; body: unknown }
  | { kind: 'form_submitted' }
  | { kind: 'error'; message: string };

/**
 * App-mode provider redirect: JSON POST to `/auth/app/v1/auth/provider/redirect`.
 * Requires BE upgrade to support `POST /auth/app/v1/auth/provider/redirect`.
 * When enabled, returns the `redirect_url` from the JSON response for the SPA to navigate to.
 * For now, browser-mode navigational form POST is used instead.
 *
 * import { ALLAUTH_APP_USER_AGENT } from './allauth-urls';
 * import { HEADLESS_CLIENT_APP } from './headless-api.types';
 * import { HEADLESS_APP_AUTH_PATH_FRAGMENT } from './headless-api-path.util';
 *
 * export async function appModeProviderRedirect(opts: {
 *   apiBaseUrl: string;
 *   provider: string;
 *   process: ProviderRedirectProcess;
 *   callbackUrl: string;
 *   sessionToken?: string | null;
 * }): Promise<string> {
 *   const base = opts.apiBaseUrl.replace(/\/$/, '');
 *   const url = `${base}${HEADLESS_APP_AUTH_PATH_FRAGMENT}auth/provider/redirect`;
 *
 *   const headers: Record<string, string> = {
 *     'Content-Type': 'application/json',
 *     Accept: 'application/json',
 *     'User-Agent': ALLAUTH_APP_USER_AGENT,
 *   };
 *   if (opts.sessionToken) {
 *     headers['X-Session-Token'] = opts.sessionToken;
 *   }
 *
 *   const response = await fetch(url, {
 *     method: 'POST',
 *     headers,
 *     body: JSON.stringify({
 *       provider: opts.provider,
 *       process: opts.process,
 *       callback_url: opts.callbackUrl,
 *     }),
 *   });
 *
 *   const body = await response.json();
 *   if (body?.data?.redirect_url) {
 *     return body.data.redirect_url;
 *   }
 *   if (body?.errors?.[0]?.message) {
 *     throw new Error(body.errors[0].message);
 *   }
 *   throw new Error(`Provider redirect failed (status ${response.status})`);
 * }
 */

/**
 * POST target for django-allauth headless provider redirect — BE OpenAPI publishes this under the
 * **browser** client only (`POST .../auth/browser/v1/auth/provider/redirect`), synchronous/non-XHR.
 */
export function buildHeadlessProviderRedirectPostUrl(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, '');
  return `${base}/auth/${HEADLESS_CLIENT_BROWSER}/v1${ALLAUTH_URLS.REDIRECT_TO_PROVIDER}`;
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
 * Both **`login`** and **`connect`** must use a **navigational** HTML form POST per BE contract.
 *
 * `fetch(..., redirect: 'manual')` breaks **`connect`** on SPA↔API split origins: cross-origin 302 becomes
 * **`opaqueredirect`**, so JS cannot read `Location` and the IdP step never runs in the user agent.
 *
 * Django `RedirectToProviderForm` binds only `provider`, `callback_url`, `process`; **`connect`**
 * relies on cookie-backed session on the browser client (prime `/auth/browser/v1/config`). Navigational POST
 * sends cookies; `X-Session-Token` cannot be attached on a real form.
 */
export async function startHeadlessProviderRedirect(opts: {
  apiBaseUrl: string;
  provider: string;
  process: ProviderRedirectProcess;
  callbackUrl: string;
  csrfMiddlewareToken?: string | null;
}): Promise<ProviderRedirectResult> {
  const actionUrl = buildHeadlessProviderRedirectPostUrl(opts.apiBaseUrl);

  const fields: Record<string, string> = {
    provider: opts.provider,
    process: opts.process,
    callback_url: opts.callbackUrl,
  };
  const csrf =
    opts.csrfMiddlewareToken !== undefined
      ? opts.csrfMiddlewareToken
      : getDjangoCsrfTokenForRequest();
  if (csrf) {
    fields['csrfmiddlewaretoken'] = csrf;
  }

  if (typeof document === 'undefined' || !document.body) {
    return {
      kind: 'error',
      message:
        'Provider redirect requires a DOM (navigational form POST). SSR or non-browser contexts cannot start browser OAuth.',
    };
  }

  try {
    submitHeadlessProviderRedirectForm(actionUrl, fields);
  } catch (e: unknown) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }

  return { kind: 'form_submitted' };
}
