import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import {
  isIncorrectCodeError,
  isWebAuthnIncorrectCodeError,
  parseRetryAfterSeconds,
} from './error.utils';

describe('error.utils', () => {
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
