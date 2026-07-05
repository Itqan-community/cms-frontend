import {
  isPasskeyAutoPromptCancellation,
  shouldAttemptPasskeyAutoPrompt,
} from './passkey-auto-prompt.util';

describe('passkey-auto-prompt.util', () => {
  describe('shouldAttemptPasskeyAutoPrompt', () => {
    it('returns true when PublicKeyCredential is available in secure context', () => {
      expect(shouldAttemptPasskeyAutoPrompt()).toBe(
        typeof PublicKeyCredential !== 'undefined'
      );
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
