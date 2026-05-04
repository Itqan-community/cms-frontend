import type { ParamMap } from '@angular/router';

/**
 * Maps `error` / `error_description` query params from django-allauth redirects to `AUTH.OAUTH.*` keys.
 * Unknown codes still resolve to a generic key; descriptions may be surfaced via
 * {@link oauthCallbackErrorDetailForDisplay}.
 */
export function oauthCallbackErrorTranslationKey(params: ParamMap): string {
  const code = (params.get('error') ?? '').trim().toLowerCase();
  const desc = (params.get('error_description') ?? '').trim().toLowerCase();
  const combined = `${code} ${desc}`;

  if (!code && !desc) {
    return 'AUTH.OAUTH.ERROR';
  }

  if (code === 'access_denied' || combined.includes('access_denied')) {
    return 'AUTH.OAUTH.ACCESS_DENIED';
  }

  if (
    combined.includes('account_already_exists') ||
    combined.includes('already exists') ||
    combined.includes('already_has') ||
    (combined.includes('social') &&
      (combined.includes('already') || combined.includes('exists') || combined.includes('associated'))) ||
    (combined.includes('provider') && (combined.includes('already') || combined.includes('linked')))
  ) {
    return 'AUTH.OAUTH.PROVIDER_ACCOUNT_IN_USE';
  }

  if (code === 'server_error' || combined.includes('server_error')) {
    return 'AUTH.OAUTH.SERVER_ERROR';
  }

  return 'AUTH.OAUTH.ERROR';
}

/** Safe short snippet for optional UI; strip obvious HTML / long payloads. */
export function oauthCallbackErrorDetailForDisplay(params: ParamMap): string | null {
  const raw = params.get('error_description')?.trim();
  if (!raw) {
    return null;
  }
  const cleaned = raw.replace(/<[^>]+>/g, '').slice(0, 280);
  return cleaned.length > 0 ? cleaned : null;
}

/** Heuristic for headless/provider errors returned in-app (not query params). */
export function headlessMessageLooksLikeProviderAccountInUse(message: string): boolean {
  const m = message.toLowerCase();
  if (!m.trim()) {
    return false;
  }
  return (
    /already|exists|linked|associated|another user|duplicate|in use|not unique|conflict/.test(m) &&
    /social|provider|google|github|oauth|account/.test(m)
  );
}
