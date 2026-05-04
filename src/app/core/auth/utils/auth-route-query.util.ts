import type { ActivatedRoute, ParamMap } from '@angular/router';

/** Official SPA uses `next`; legacy CMS used `returnUrl`. */
export function readContinueUrl(params: ParamMap): string {
  const raw = params.get('next') || params.get('returnUrl') || '/gallery';
  return raw.startsWith('/') ? raw : '/gallery';
}

/**
 * Absolute `callback_url` for headless `RedirectToProviderForm` (django-allauth validates absolute URLs).
 * Preserves `next` / `returnUrl` from the current route so `/account/provider/callback` can resume flow.
 *
 * @param opts.origin — override `window.location.origin` (tests / non-browser without spying `location`).
 */
export function buildHeadlessOAuthCallbackUrl(
  route: ActivatedRoute | null,
  opts?: { origin?: string }
): string {
  const pathOnly = '/account/provider/callback';
  const win = typeof window !== 'undefined' ? window : undefined;
  const origin = opts?.origin ?? win?.location.origin;
  if (!origin) {
    return pathOnly;
  }
  const params = route?.snapshot?.queryParamMap;
  const next = params?.get('next') || params?.get('returnUrl');
  if (next && next.startsWith('/')) {
    const u = new URL(pathOnly, origin);
    u.searchParams.set('next', next);
    return u.toString();
  }
  return `${origin}${pathOnly}`;
}

/** Callback URL after linking a provider — return user to connected-accounts page. */
export function buildHeadlessConnectOAuthCallbackUrl(
  nextPath = '/account/providers',
  opts?: { origin?: string }
): string {
  const pathOnly = '/account/provider/callback';
  const win = typeof window !== 'undefined' ? window : undefined;
  const origin = opts?.origin ?? win?.location.origin;
  if (!origin) {
    return pathOnly;
  }
  const u = new URL(pathOnly, origin);
  if (nextPath.startsWith('/')) {
    u.searchParams.set('next', nextPath);
  }
  return u.toString();
}
