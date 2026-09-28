import { HttpErrorResponse } from '@angular/common/http';
import {
  fallbackKeyForHttpStatus,
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

    it('lists pydantic field errors from a ninja validation_error (en)', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          error_name: 'validation_error',
          message: 'Invalid Input',
          extra: [
            { type: 'missing', loc: ['body', 'payload', 'name_ar'], msg: 'Field required' },
            {
              type: 'string_too_long',
              loc: ['body', 'payload', 'slug'],
              msg: 'String should have at most 50 characters',
            },
          ],
        },
      });
      const msg = resolveApiErrorMessage(
        err,
        { fallbackKey: 'ERRORS.SERVER_ERROR' },
        mockTranslate('en')
      );
      expect(msg).toBe('name ar: Field required. slug: String should have at most 50 characters.');
    });

    it('translates pydantic field errors when the UI is Arabic', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          error_name: 'validation_error',
          message: 'Invalid Input',
          extra: [
            { type: 'missing', loc: ['body', 'payload', 'name_ar'], msg: 'Field required' },
            { type: 'int_parsing', loc: ['query', 'page'], msg: 'Input should be a valid integer' },
          ],
        },
      });
      const translate: ApiErrorTranslator = {
        currentLang: 'ar',
        instant: (key, params) => `${key}(${params?.['field']})`,
      };
      const msg = resolveApiErrorMessage(err, { fallbackKey: 'ERRORS.SERVER_ERROR' }, translate);
      expect(msg).toBe('ERRORS.FIELD_REQUIRED(name ar) ERRORS.FIELD_INVALID(page)');
    });

    it('uses localized Django validation_error strings in extra', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          error_name: 'validation_error',
          message: 'مدخلات غير صالحة',
          extra: ['القيمة مكررة.'],
        },
      });
      const msg = resolveApiErrorMessage(
        err,
        { fallbackKey: 'ERRORS.SERVER_ERROR' },
        mockTranslate('ar')
      );
      expect(msg).toBe('القيمة مكررة.');
    });
  });

  describe('fallbackKeyForHttpStatus', () => {
    it('maps statuses to non-server keys for client errors', () => {
      expect(fallbackKeyForHttpStatus(0)).toBe('ERRORS.NETWORK_ERROR');
      expect(fallbackKeyForHttpStatus(400)).toBe('ERRORS.VALIDATION_ERROR');
      expect(fallbackKeyForHttpStatus(422)).toBe('ERRORS.VALIDATION_ERROR');
      expect(fallbackKeyForHttpStatus(404)).toBe('ERRORS.NOT_FOUND');
      expect(fallbackKeyForHttpStatus(409)).toBe('ERRORS.REQUEST_FAILED');
      expect(fallbackKeyForHttpStatus(500)).toBe('ERRORS.SERVER_ERROR');
      expect(fallbackKeyForHttpStatus(502)).toBe('ERRORS.SERVER_ERROR');
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

    it('suppresses no_changes_to_publish (handled by the content editor popup)', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: { error_name: 'no_changes_to_publish', message: 'x' },
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
