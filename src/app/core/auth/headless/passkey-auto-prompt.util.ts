import type { PasskeyLoginFlowResult } from './passkey-auth.flow';
import { isPasskeyClientEnvironmentSupported } from './webauthn-capability.util';
import { isWebAuthnUserCancelledError } from './webauthn-client-error.util';

/**
 * Whether the login page can offer passkeys through autofill (conditional mediation).
 * The browser only surfaces the prompt when a passkey for this site exists, so users
 * without one never see an unsolicited dialog.
 */
export async function shouldAttemptPasskeyAutoPrompt(): Promise<boolean> {
  if (!isPasskeyClientEnvironmentSupported()) {
    return false;
  }
  const pkc = PublicKeyCredential as unknown as {
    isConditionalMediationAvailable?: () => Promise<boolean>;
  };
  if (typeof pkc.isConditionalMediationAvailable !== 'function') {
    return false;
  }
  try {
    return await pkc.isConditionalMediationAvailable();
  } catch {
    return false;
  }
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
