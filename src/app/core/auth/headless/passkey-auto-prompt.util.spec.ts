import {
  isPasskeyAutoPromptCancellation,
  shouldAttemptPasskeyAutoPrompt,
} from './passkey-auto-prompt.util';
import {
  restorePasskeyEnvironment,
  setPasskeyClientEnvironmentSupported,
  snapshotPasskeyEnvironment,
  type PasskeyEnvironmentSnapshot,
} from './passkey-test-env.helper';

describe('passkey-auto-prompt.util', () => {
  describe('shouldAttemptPasskeyAutoPrompt', () => {
    let passkeyEnvSnapshot: PasskeyEnvironmentSnapshot;
    let pkc: { isConditionalMediationAvailable?: () => Promise<boolean> };
    let previousIsConditional: (() => Promise<boolean>) | undefined;

    beforeEach(() => {
      passkeyEnvSnapshot = snapshotPasskeyEnvironment();
      setPasskeyClientEnvironmentSupported(true);
      pkc = PublicKeyCredential as unknown as typeof pkc;
      previousIsConditional = pkc.isConditionalMediationAvailable;
    });

    afterEach(() => {
      pkc.isConditionalMediationAvailable = previousIsConditional;
      restorePasskeyEnvironment(passkeyEnvSnapshot);
    });

    it('returns true when the browser supports passkey autofill', async () => {
      pkc.isConditionalMediationAvailable = () => Promise.resolve(true);
      expect(await shouldAttemptPasskeyAutoPrompt()).toBe(true);
    });

    it('returns false when passkey autofill is unavailable', async () => {
      pkc.isConditionalMediationAvailable = () => Promise.resolve(false);
      expect(await shouldAttemptPasskeyAutoPrompt()).toBe(false);
    });

    it('returns false when the browser cannot report passkey autofill support', async () => {
      pkc.isConditionalMediationAvailable = undefined;
      expect(await shouldAttemptPasskeyAutoPrompt()).toBe(false);
    });

    it('returns false outside a passkey-capable environment', async () => {
      setPasskeyClientEnvironmentSupported(false);
      expect(await shouldAttemptPasskeyAutoPrompt()).toBe(false);
    });
  });

  describe('isPasskeyAutoPromptCancellation', () => {
    it('detects cancelled flow result', () => {
      expect(isPasskeyAutoPromptCancellation({ ok: false, reason: 'cancelled' })).toBe(true);
    });

    it('detects NotAllowedError DOMException', () => {
      const err = new DOMException('not allowed', 'NotAllowedError');
      expect(isPasskeyAutoPromptCancellation(err)).toBe(true);
    });

    it('is false for non-cancellation errors', () => {
      expect(isPasskeyAutoPromptCancellation(new Error('network'))).toBe(false);
      expect(isPasskeyAutoPromptCancellation({ ok: true, nextUrl: '/gallery' })).toBe(false);
    });
  });
});
