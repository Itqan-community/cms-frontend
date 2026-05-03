import type { ActivatedRoute, ParamMap } from '@angular/router';

/** Official SPA uses `next`; legacy CMS used `returnUrl`. */
export function readContinueUrl(params: ParamMap): string {
  const raw = params.get('next') || params.get('returnUrl') || '/gallery';
  return raw.startsWith('/') ? raw : '/gallery';
}

/**
 * Absolute `callback_url` for headless `RedirectToProviderForm` (django-allauth validates absolute URLs).
 * Preserves `next` / `returnUrl` from the current route so `/account/provider/callback` can resume flow.
 */
export function buildHeadlessOAuthCallbackUrl(route: ActivatedRoute | null): string {
  const pathOnly = '/account/provider/callback';
  if (typeof window === 'undefined') {
    return pathOnly;
  }
  const origin = window.location.origin;
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
export function buildHeadlessConnectOAuthCallbackUrl(nextPath = '/account/providers'): string {
  const pathOnly = '/account/provider/callback';
  if (typeof window === 'undefined') {
    return pathOnly;
  }
  const origin = window.location.origin;
  const u = new URL(pathOnly, origin);
  if (nextPath.startsWith('/')) {
    u.searchParams.set('next', nextPath);
  }
  return u.toString();
}
