import { convertToParamMap } from '@angular/router';
import {
  headlessMessageLooksLikeProviderAccountInUse,
  oauthCallbackErrorDetailForDisplay,
  oauthCallbackErrorTranslationKey,
} from './oauth-callback-error.util';

describe('oauth-callback-error.util', () => {
  describe('oauthCallbackErrorTranslationKey', () => {
    it('maps access_denied', () => {
      const m = convertToParamMap({ error: 'access_denied' });
      expect(oauthCallbackErrorTranslationKey(m)).toBe('AUTH.OAUTH.ACCESS_DENIED');
    });

    it('maps duplicate / already-exists style descriptions', () => {
      const m = convertToParamMap({
        error: 'invalid_request',
        error_description: 'social account already exists',
      });
      expect(oauthCallbackErrorTranslationKey(m)).toBe('AUTH.OAUTH.PROVIDER_ACCOUNT_IN_USE');
    });

    it('falls back to generic ERROR', () => {
      const m = convertToParamMap({ error: 'unknown_error_code' });
      expect(oauthCallbackErrorTranslationKey(m)).toBe('AUTH.OAUTH.ERROR');
    });
  });

  describe('oauthCallbackErrorDetailForDisplay', () => {
    it('returns sanitized short description', () => {
      const m = convertToParamMap({
        error_description: '  Something went wrong  ',
      });
      expect(oauthCallbackErrorDetailForDisplay(m)).toBe('Something went wrong');
    });

    it('strips angle brackets', () => {
      const m = convertToParamMap({
        error_description: 'Fail <script>x</script>',
      });
      expect(oauthCallbackErrorDetailForDisplay(m)).toBe('Fail x');
    });
  });

  describe('headlessMessageLooksLikeProviderAccountInUse', () => {
    it('detects typical duplicate social wording', () => {
      expect(
        headlessMessageLooksLikeProviderAccountInUse(
          'This social account is already connected to another user.'
        )
      ).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(headlessMessageLooksLikeProviderAccountInUse('Network failure')).toBe(false);
    });
  });
});
