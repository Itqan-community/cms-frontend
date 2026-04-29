import { webauthnCredentialRequestBody } from './headless-webauthn-http.util';

describe('headless-webauthn-http.util', () => {
  it('passes through payload that already has credential key', () => {
    const envelope = { credential: { type: 'public-key', id: 'a' } };
    expect(webauthnCredentialRequestBody(envelope)).toBe(envelope);
  });

  it('wraps raw inner credential', () => {
    const inner = { type: 'public-key', id: 'a' };
    expect(webauthnCredentialRequestBody(inner)).toEqual({ credential: inner });
  });
});
