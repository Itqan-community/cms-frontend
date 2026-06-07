import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { recoverHeadlessJsonOkOnHttpError } from './headless-http-recover.util';

describe('recoverHeadlessJsonOkOnHttpError', () => {
  it('re-emits body when HTTP 401 but JSON status is 200', (done) => {
    const payload = { status: 200, data: { id: 1 }, meta: {} };
    const err = new HttpErrorResponse({
      status: 401,
      error: payload,
    });
    recoverHeadlessJsonOkOnHttpError(throwError(() => err)).subscribe({
      next: (v) => {
        expect(v).toEqual(payload);
        done();
      },
      error: () => fail('should not error'),
    });
  });

  it('passes through success responses', (done) => {
    const payload = { status: 200, data: {} };
    recoverHeadlessJsonOkOnHttpError(of(payload as unknown)).subscribe({
      next: (v) => {
        expect(v).toEqual(payload);
        done();
      },
      error: () => fail('should not error'),
    });
  });

  it('rethrows real 401 auth flow body', (done) => {
    const err = new HttpErrorResponse({
      status: 401,
      error: { status: 401, data: { flows: [] }, meta: { is_authenticated: false } },
    });
    recoverHeadlessJsonOkOnHttpError(throwError(() => err)).subscribe({
      next: () => fail('should error'),
      error: (e) => {
        expect(e).toBe(err);
        done();
      },
    });
  });
});
