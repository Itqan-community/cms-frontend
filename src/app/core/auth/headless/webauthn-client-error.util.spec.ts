import { isWebAuthnUserCancelledError } from './webauthn-client-error.util';

describe('webauthn-client-error.util', () => {
  describe('isWebAuthnUserCancelledError', () => {
    it('detects NotAllowedError', () => {
      const err = new DOMException(
        'The operation either timed out or was not allowed. See: https://www.w3.org/TR/webauthn-2/#sctn-privacy-considerations-client.',
        'NotAllowedError'
      );
      expect(isWebAuthnUserCancelledError(err)).toBe(true);
    });

    it('detects AbortError', () => {
      const err = new DOMException('The operation was aborted.', 'AbortError');
      expect(isWebAuthnUserCancelledError(err)).toBe(true);
    });

    it('is false for SecurityError', () => {
      const err = new DOMException('Relying party ID mismatch', 'SecurityError');
      expect(isWebAuthnUserCancelledError(err)).toBe(false);
    });

    it('is false for non-DOM errors', () => {
      expect(isWebAuthnUserCancelledError(new Error('nope'))).toBe(false);
    });
  });
});
