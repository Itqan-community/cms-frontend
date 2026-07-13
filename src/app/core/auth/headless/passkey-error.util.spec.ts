import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { resolvePasskeyFlowError } from './passkey-error.util';

describe('passkey-error.util', () => {
  const translate = {
    instant: (key: string) => key,
  } as TranslateService;
  const router = { navigate: jasmine.createSpy('navigate') } as unknown as Router;

  it('maps user-cancelled DOMException to CANCELLED', () => {
    const err = new DOMException(
      'The operation either timed out or was not allowed.',
      'NotAllowedError'
    );
    const res = resolvePasskeyFlowError(err, translate, router, 'login');
    expect(res).toEqual({ kind: 'message', message: 'AUTH.PASSKEY.CANCELLED' });
  });

  it('maps webauthn incorrect_code to WEBAUTHN_VERIFICATION_FAILED', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: {
        status: 400,
        errors: [{ code: 'incorrect_code', message: 'Bad credential' }],
      },
    });
    const res = resolvePasskeyFlowError(err, translate, router, 'login');
    expect(res).toEqual({
      kind: 'message',
      message: 'AUTH.PASSKEY.WEBAUTHN_VERIFICATION_FAILED',
    });
  });
});
