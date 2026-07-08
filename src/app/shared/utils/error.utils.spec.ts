import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import {
  extractAllauthErrorsMessages,
  getErrorMessage,
  isAngularHttpFailureMessage,
  isIncorrectCodeError,
  isUnverifiedEmailError,
  isWebAuthnIncorrectCodeError,
  parseRetryAfterSeconds,
} from './error.utils';

describe('error.utils', () => {
  describe('isUnverifiedEmailError', () => {
    it('is true for HTTP 409 with unverified_email code', () => {
      const err = new HttpErrorResponse({
        status: 409,
        error: {
          status: 409,
          errors: [
            {
              code: 'unverified_email',
              message: 'لا يمكنك تفعيل المصادقة الثنائية إلا بعد التحقق من عنوان بريدك الإلكتروني.',
            },
          ],
        },
      });
      expect(isUnverifiedEmailError(err)).toBe(true);
    });

    it('is false without unverified_email code', () => {
      const err = new HttpErrorResponse({
        status: 409,
        error: {
          status: 409,
          errors: [{ code: 'conflict', message: 'Other' }],
        },
      });
      expect(isUnverifiedEmailError(err)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('joins errors for 409 allauth envelope', () => {
      const err = new HttpErrorResponse({
        status: 409,
        error: {
          status: 409,
          errors: [{ code: 'unverified_email', message: 'يجب تأكيد البريد أولاً.' }],
        },
      });
      expect(getErrorMessage(err)).toBe('يجب تأكيد البريد أولاً.');
    });

    it('does not return Angular HttpClient failure boilerplate', () => {
      const err = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        url: 'https://example.com/auth/app/v1/auth/webauthn/login',
        error: null,
      });
      expect(isAngularHttpFailureMessage(err.message)).toBe(true);
      expect(getErrorMessage(err)).toBeNull();
    });
  });

  describe('extractAllauthErrorsMessages', () => {
    it('extracts messages when body has numeric status and errors', () => {
      const joined = extractAllauthErrorsMessages({
        status: 409,
        errors: [{ message: 'A' }, { message: 'B' }],
      });
      expect(joined).toBe('A B');
    });
  });

  describe('parseRetryAfterSeconds', () => {
    it('reads numeric Retry-After', () => {
      const err = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '42' }),
      });
      expect(parseRetryAfterSeconds(err)).toBe(42);
    });

    it('returns null when header missing', () => {
      const err = new HttpErrorResponse({ status: 429 });
      expect(parseRetryAfterSeconds(err)).toBeNull();
    });
  });

  describe('isIncorrectCodeError', () => {
    it('detects incorrect_code on 400', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          errors: [{ code: 'incorrect_code', message: 'Bad' }],
        },
      });
      expect(isIncorrectCodeError(err)).toBe(true);
    });

    it('detects param code', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          errors: [{ param: 'code', message: 'Bad' }],
        },
      });
      expect(isIncorrectCodeError(err)).toBe(true);
    });
  });

  describe('isWebAuthnIncorrectCodeError', () => {
    it('detects incorrect_code without requiring param code', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          status: 400,
          errors: [{ code: 'incorrect_code', message: 'كود خاطئ.' }],
        },
      });
      expect(isWebAuthnIncorrectCodeError(err)).toBe(true);
      expect(isIncorrectCodeError(err)).toBe(true);
    });

    it('is false when only param code is set', () => {
      const err = new HttpErrorResponse({
        status: 400,
        error: {
          errors: [{ param: 'code', message: 'Bad' }],
        },
      });
      expect(isWebAuthnIncorrectCodeError(err)).toBe(false);
      expect(isIncorrectCodeError(err)).toBe(true);
    });
  });
});
