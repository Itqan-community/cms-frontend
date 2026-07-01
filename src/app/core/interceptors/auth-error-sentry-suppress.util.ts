import { HttpErrorResponse } from '@angular/common/http';
import { ALLAUTH_URLS } from '../auth/headless/allauth-urls';
import { isHeadlessAppAuthUrl } from '../auth/headless/headless-api-path.util';
import {
  isUnverifiedEmailError,
  isWebAuthnIncorrectCodeError,
} from '../../shared/utils/error.utils';

/**
 * GET `…/account/authenticators/totp` returns HTTP 404 both for “pending setup” (parsed in
 * HeadlessAuthApiService#getTotpStatus) and for “no TOTP”; either way interceptors still see HTTP
 * failures first unless emitted as success downstream.
 */
export function isExpectedTotpAuthenticatorStatusProbe404(
  reqUrl: string,
  reqMethod: string,
  error: HttpErrorResponse
): boolean {
  return (
    reqMethod === 'GET' &&
    error.status === 404 &&
    isHeadlessAppAuthUrl(reqUrl) &&
    reqUrl.includes(ALLAUTH_URLS.TOTP_AUTHENTICATOR)
  );
}

/** Expected business responses that should not be reported as unexpected errors. */
export function shouldSuppressSentryForHeadlessHttpError(
  reqUrl: string,
  reqMethod: string,
  error: HttpErrorResponse
): boolean {
  return (
    (isHeadlessAppAuthUrl(reqUrl) && isUnverifiedEmailError(error)) ||
    (isHeadlessAppAuthUrl(reqUrl) && isWebAuthnIncorrectCodeError(error)) ||
    isExpectedTotpAuthenticatorStatusProbe404(reqUrl, reqMethod, error)
  );
}
