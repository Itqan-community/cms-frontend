/**
 * Normalizes WebAuthn credential payloads for django-allauth headless.
 * `publicKeyCredentialToJson` / `publicKeyCredentialCreationToJson` return `{ credential: … }`.
 * POST helpers must not wrap again or the API sees `credential.credential` (often `incorrect_code`).
 */
export function webauthnCredentialRequestBody(payload: unknown): { credential: unknown } {
  if (payload !== null && typeof payload === 'object' && 'credential' in payload) {
    return payload as { credential: unknown };
  }
  return { credential: payload };
}
