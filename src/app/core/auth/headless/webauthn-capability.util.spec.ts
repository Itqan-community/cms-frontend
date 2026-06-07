import { isPasskeyClientEnvironmentSupported } from './webauthn-capability.util';

describe('isPasskeyClientEnvironmentSupported', () => {
  it('returns a boolean', () => {
    expect(typeof isPasskeyClientEnvironmentSupported()).toBe('boolean');
  });

  it('is false when PublicKeyCredential is missing', () => {
    const g = globalThis as { PublicKeyCredential?: unknown };
    const orig = g.PublicKeyCredential;
    try {
      delete g.PublicKeyCredential;
      expect(isPasskeyClientEnvironmentSupported()).toBe(false);
    } finally {
      if (orig !== undefined) {
        g.PublicKeyCredential = orig;
      }
    }
  });
});
