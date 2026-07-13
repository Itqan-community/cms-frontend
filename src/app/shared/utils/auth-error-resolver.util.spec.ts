import { HttpErrorResponse } from '@angular/common/http';
import {
  isMessageLocalizedForUi,
  resolveAuthErrorMessage,
  type AuthErrorTranslator,
} from './auth-error-resolver.util';

function mockTranslate(lang: string, dict: Record<string, string> = {}): AuthErrorTranslator {
  return {
    currentLang: lang,
    instant: (key: string) => dict[key] ?? `[${key}]`,
  };
}

describe('auth-error-resolver.util', () => {
  describe('isMessageLocalizedForUi', () => {
    it('accepts Arabic text for ar UI', () => {
      expect(isMessageLocalizedForUi('كلمة المرور غير صحيحة.', 'ar')).toBe(true);
    });

    it('rejects English text for ar UI', () => {
      expect(isMessageLocalizedForUi('Invalid password.', 'en')).toBe(true);
      expect(isMessageLocalizedForUi('Invalid password.', 'ar')).toBe(false);
    });

    it('accepts English text for en UI', () => {
      expect(isMessageLocalizedForUi('Invalid password.', 'en')).toBe(true);
    });

    it('rejects Arabic text for en UI', () => {
      expect(isMessageLocalizedForUi('كلمة المرور غير صحيحة.', 'en')).toBe(false);
    });

    it('rejects generic server messages', () => {
      expect(isMessageLocalizedForUi('Server Error', 'en')).toBe(false);
    });
  });

  describe('resolveAuthErrorMessage', () => {
    it('prefers mapped code over backend message', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          status: 400,
          errors: [
            {
              code: 'email_password_mismatch',
              message: 'كلمة المرور غير صحيحة.',
            },
          ],
        },
      });
      const msg = resolveAuthErrorMessage(
        err,
        { fallbackKey: 'AUTH.LOGIN.ERRORS.LOGIN_FAILED', context: 'login' },
        mockTranslate('en', {
          'AUTH.LOGIN.ERRORS.LOGIN_FAILED': 'Login failed fallback',
        })
      );
      expect(msg).toBe('Login failed fallback');
    });

    it('uses localized backend message when no code map', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          status: 400,
          errors: [{ code: 'custom_unknown', message: 'Custom localized error.' }],
        },
      });
      const msg = resolveAuthErrorMessage(
        err,
        { fallbackKey: 'AUTH.LOGIN.ERRORS.LOGIN_FAILED', context: 'login' },
        mockTranslate('en')
      );
      expect(msg).toBe('Custom localized error.');
    });

    it('falls back when backend message is wrong language', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          status: 400,
          errors: [{ message: 'كلمة المرور غير صحيحة.' }],
        },
      });
      const msg = resolveAuthErrorMessage(
        err,
        { fallbackKey: 'AUTH.LOGIN.ERRORS.LOGIN_FAILED', context: 'login' },
        mockTranslate('en', { 'AUTH.LOGIN.ERRORS.LOGIN_FAILED': 'Login failed.' })
      );
      expect(msg).toBe('Login failed.');
    });

    it('maps incorrect_code in mfa_webauthn context', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          status: 400,
          errors: [{ code: 'incorrect_code', message: 'Bad' }],
        },
      });
      const msg = resolveAuthErrorMessage(
        err,
        { fallbackKey: 'AUTH.MFA.ERROR', context: 'mfa_webauthn' },
        mockTranslate('en', {
          'AUTH.PASSKEY.WEBAUTHN_VERIFICATION_FAILED': 'Passkey not verified',
        })
      );
      expect(msg).toBe('Passkey not verified');
    });

    it('maps incorrect_code in mfa_totp context', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          status: 400,
          errors: [{ code: 'incorrect_code', message: 'Bad' }],
        },
      });
      const msg = resolveAuthErrorMessage(
        err,
        { fallbackKey: 'AUTH.MFA.ERROR', context: 'mfa_totp' },
        mockTranslate('en', { 'AUTH.MFA.INCORRECT_CODE': 'Wrong MFA code' })
      );
      expect(msg).toBe('Wrong MFA code');
    });

    it('maps reauth password incorrect_code to INCORRECT_PASSWORD', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          status: 400,
          errors: [{ code: 'incorrect_code', message: 'x' }],
        },
      });
      const msg = resolveAuthErrorMessage(
        err,
        { fallbackKey: 'AUTH.REAUTH.ERROR', context: 'reauth_password' },
        mockTranslate('en', { 'AUTH.REAUTH.INCORRECT_PASSWORD': 'Wrong password' })
      );
      expect(msg).toBe('Wrong password');
    });
  });
});
