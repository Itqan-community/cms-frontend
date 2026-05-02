import type { AuthenticationMeta } from './headless-api.types';
import { AllauthAuthChangeBus } from './allauth-auth-change.bus';
import { HeadlessAppTokenService } from './headless-app-token.service';

export interface AllauthEnvelopeLike {
  status: number;
  meta?: AuthenticationMeta & Record<string, unknown>;
}

/**
 * Side effects mirroring `.temp/django-allauth/frontend/src/lib/allauth.js` `request()` tail.
 */
export function applyAllauthEnvelopeSideEffects(
  body: unknown,
  tokens: HeadlessAppTokenService,
  bus: AllauthAuthChangeBus
): void {
  if (!body || typeof body !== 'object' || !('status' in body)) {
    return;
  }
  const msg = body as AllauthEnvelopeLike;
  if (msg.status === 410) {
    tokens.clearSessionToken();
  }
  if (msg.meta?.session_token && typeof msg.meta.session_token === 'string') {
    tokens.setSessionToken(msg.meta.session_token);
  }
  if (
    [401, 410].includes(msg.status) ||
    (msg.status === 200 && msg.meta?.is_authenticated === true)
  ) {
    bus.emit(body);
  }
}
