/**
 * Browser WebAuthn API errors surfaced as DOMException (e.g. user dismisses the OS passkey UI).
 * @see https://www.w3.org/TR/webauthn-2/#sctn-privacy-considerations-client
 */
export function isWebAuthnUserCancelledError(error: unknown): boolean {
  if (!(error instanceof DOMException)) {
    return false;
  }
  if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
    return true;
  }
  const msg = error.message.toLowerCase();
  return (
    /timed out|not allowed|operation was cancelled|canceled|cancelled|user denied|request is not allowed/i.test(
      msg
    ) || /privacy-considerations-client/i.test(msg)
  );
}
