import { HttpErrorResponse } from '@angular/common/http';
import {
  resolveApiErrorMessage,
  shouldSuppressGlobalErrorToast,
  type ApiErrorTranslator,
} from './api-error-resolver.util';

function mockTranslate(lang: string, dict: Record<string, string> = {}): ApiErrorTranslator {
  return {
    currentLang: lang,
    instant: (key: string) => dict[key] ?? `[${key}]`,
  };
}

describe('api-error-resolver.util', () => {
  describe('resolveApiErrorMessage', () => {
    it('maps error_name to i18n', () => {
      const err = new HttpErrorResponse({
        status: 409,
        error: {
          error_name: 'restricted_for_tenant_conflict',
          message: 'English conflict message',
        },
      });
      const msg = resolveApiErrorMessage(
        err,
        { fallbackKey: 'ERRORS.SERVER_ERROR' },
        mockTranslate('en', {
          'ERRORS.RESTRICTED_FOR_TENANT_CONFLICT': 'Cannot enable restriction.',
        })
      );
      expect(msg).toBe('Cannot enable restriction.');
    });

    it('uses localized backend message when no code map', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: { message: 'رسالة خطأ من الخادم.' },
      });
      const msg = resolveApiErrorMessage(
        err,
        { fallbackKey: 'ERRORS.SERVER_ERROR' },
        mockTranslate('ar')
      );
      expect(msg).toBe('رسالة خطأ من الخادم.');
    });

    it('falls back when backend message is wrong language', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: { message: 'English only error.' },
      });
      const msg = resolveApiErrorMessage(
        err,
        { fallbackKey: 'ERRORS.SERVER_ERROR' },
        mockTranslate('ar', { 'ERRORS.SERVER_ERROR': 'خطأ في الخادم' })
      );
      expect(msg).toBe('خطأ في الخادم');
    });
  });

  describe('shouldSuppressGlobalErrorToast', () => {
    it('suppresses restricted_for_tenant_conflict', () => {
      const err = new HttpErrorResponse({
        status: 409,
        error: { error_name: 'restricted_for_tenant_conflict', message: 'x' },
      });
      expect(shouldSuppressGlobalErrorToast(err)).toBe(true);
    });

    it('suppresses invalid_status', () => {
      const err = new HttpErrorResponse({
        status: 409,
        error: { error_name: 'invalid_status', message: 'x' },
      });
      expect(shouldSuppressGlobalErrorToast(err)).toBe(true);
    });

    it('does not suppress generic errors', () => {
      const err = new HttpErrorResponse({
        status: 500,
        error: { message: 'fail' },
      });
      expect(shouldSuppressGlobalErrorToast(err)).toBe(false);
    });
  });
});
