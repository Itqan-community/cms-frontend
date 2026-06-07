/**
 * Django CSRF for the SPA:
 * - **Same origin as API (e.g. staging app + API on one site):** rely on `csrftoken`
 *   from `document.cookie` after a credentialed GET (e.g. `/config`) sets it. No CSRF
 *   field in JSON is required.
 * - **Cross-origin (e.g. localhost → API):** JS cannot read the API’s cookie; use
 *   `extractCsrfFromHeadlessConfigResponse`, an exposed `X-CSRFToken` response header,
 *   or a dev proxy — see `getDjangoCsrfTokenForRequest`.
 *
 * Read a cookie by name (`document.cookie` is only available in the browser).
 * Django’s default CSRF cookie name is `csrftoken` (override via CSRF_COOKIE_NAME).
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) {
    return null;
  }
  return decodeURIComponent(match.slice(name.length + 1));
}

/** Value for `X-CSRFToken` / `csrfmiddlewaretoken` (Django). Same-origin / proxy dev only. */
export function getDjangoCsrfTokenFromCookie(): string | null {
  return getCookie('csrftoken');
}

/**
 * Optional override when the token cannot be read from `document.cookie` (cross-origin)
 * or when supplied explicitly from config JSON / response headers. For same-origin
 * deployments, this is often set from the cookie right after `GET /config`.
 */
let crossOriginCsrfFromApi: string | null = null;

export function setCrossOriginDjangoCsrfToken(token: string | null): void {
  crossOriginCsrfFromApi = token;
}

/** `X-CSRFToken` / form body: in-memory (JSON/header/cached from cookie), else `csrftoken` cookie. */
export function getDjangoCsrfTokenForRequest(): string | null {
  return crossOriginCsrfFromApi ?? getDjangoCsrfTokenFromCookie();
}

/**
 * Best-effort parse if backend puts CSRF in config JSON (optional; not required when
 * the app is served same-origin to the API and `document.cookie` can read `csrftoken`).
 */
export function extractCsrfFromHeadlessConfigResponse(body: unknown): string | null {
  if (body == null || typeof body !== 'object') {
    return null;
  }
  const o = body as Record<string, unknown>;
  for (const k of ['csrf_token', 'csrftoken', 'CSRFToken'] as const) {
    if (typeof o[k] === 'string' && o[k]) {
      return o[k] as string;
    }
  }
  const data = o['data'];
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    for (const k of ['csrf_token', 'csrftoken', 'CSRFToken'] as const) {
      if (typeof d[k] === 'string' && d[k]) {
        return d[k] as string;
      }
    }
  }
  const meta = o['meta'];
  if (meta && typeof meta === 'object') {
    const m = meta as Record<string, unknown>;
    for (const k of ['csrf_token', 'csrftoken', 'CSRFToken'] as const) {
      if (typeof m[k] === 'string' && m[k]) {
        return m[k] as string;
      }
    }
  }
  return null;
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isUnsafeHttpMethod(method: string): boolean {
  return UNSAFE_METHODS.has(method.toUpperCase());
}
