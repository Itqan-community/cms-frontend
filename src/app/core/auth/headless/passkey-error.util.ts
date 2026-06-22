import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { resolveAuthErrorMessage } from '../../../shared/utils/auth-error-resolver.util';
import { isWebAuthnIncorrectCodeError } from '../../../shared/utils/error.utils';
import { isReauthenticationBody, tryNavigateForAuth401 } from './headless-auth-flow.util';
import { WebAuthnRpIdMismatchError } from './webauthn-rp-id.util';

export type PasskeyErrorContext = 'login' | 'signup' | 'setup';

export type PasskeyErrorResolution =
  | { kind: 'message'; message: string }
  | { kind: 'reauth_required'; message: string }
  | { kind: 'navigated' }
  | { kind: 'none' };

export function resolvePasskeyFlowError(
  error: unknown,
  translate: TranslateService,
  router: Router,
  context: PasskeyErrorContext
): PasskeyErrorResolution {
  if (error instanceof WebAuthnRpIdMismatchError) {
    return {
      kind: 'message',
      message: translate.instant('AUTH.PASSKEY.RP_ID_ORIGIN_MISMATCH', {
        rpId: error.rpId,
        host: error.hostname,
      }),
    };
  }
  if (
    error instanceof DOMException &&
    error.name === 'SecurityError' &&
    /relying party|webauthn|well-known/i.test(error.message)
  ) {
    return {
      kind: 'message',
      message: translate.instant('AUTH.PASSKEY.RP_ID_BROWSER_REJECT'),
    };
  }
  if (error instanceof HttpErrorResponse) {
    if (isWebAuthnIncorrectCodeError(error)) {
      return {
        kind: 'message',
        message: translate.instant('AUTH.PASSKEY.WEBAUTHN_STATE_ERROR'),
      };
    }
    if (context === 'setup' && isReauthenticationBody(error.error)) {
      return {
        kind: 'reauth_required',
        message: translate.instant('AUTH.PASSKEY.SETUP_REAUTH_REQUIRED'),
      };
    }
    if (tryNavigateForAuth401(router, error)) {
      return { kind: 'navigated' };
    }
    return {
      kind: 'message',
      message: resolveAuthErrorMessage(
        error,
        { fallbackKey: 'AUTH.PASSKEY.ERROR', context: 'mfa_webauthn' },
        translate
      ),
    };
  }
  return {
    kind: 'message',
    message: resolveAuthErrorMessage(
      error,
      { fallbackKey: 'AUTH.PASSKEY.ERROR', context: 'mfa_webauthn' },
      translate
    ),
  };
}
