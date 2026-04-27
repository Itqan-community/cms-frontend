/**
 * FE-only passkey / WebAuthn capability (no backend probe).
 * Used to hide passkey entry points on clients that cannot use `navigator.credentials`.
 */
export function isPasskeyClientEnvironmentSupported(): boolean {
  if (typeof globalThis === 'undefined') {
    return false;
  }
  const g = globalThis as { isSecureContext?: boolean; PublicKeyCredential?: unknown };
  if (g.isSecureContext === false) {
    return false;
  }
  return typeof g.PublicKeyCredential !== 'undefined';
}
