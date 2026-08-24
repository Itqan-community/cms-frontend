import type { PasskeyLoginFlowResult } from './passkey-auth.flow';
import { isPasskeyClientEnvironmentSupported } from './webauthn-capability.util';
import { isWebAuthnUserCancelledError } from './webauthn-client-error.util';

/** Whether the client can attempt a one-time passkey auto-prompt on auth pages. */
export function shouldAttemptPasskeyAutoPrompt(): boolean {
  return isPasskeyClientEnvironmentSupported();
}

/** True when an auto-prompt was dismissed without completing authentication. */
export function isPasskeyAutoPromptCancellation(errorOrResult: unknown): boolean {
  if (
    errorOrResult !== null &&
    typeof errorOrResult === 'object' &&
    'ok' in errorOrResult &&
    (errorOrResult as PasskeyLoginFlowResult).ok === false &&
    (errorOrResult as { reason?: string }).reason === 'cancelled'
  ) {
    return true;
  }
  return isWebAuthnUserCancelledError(errorOrResult);
}
