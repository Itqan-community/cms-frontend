import { HttpErrorResponse } from '@angular/common/http';
import type { AllauthErrorItem, ErrorResponse } from '../../core/auth/headless/headless-api.types';

/**
 * Returns seconds from a `429` response `Retry-After` header, if present and valid.
 * (Numeric seconds only; HTTP-date form is not parsed.)
 */
export function parseRetryAfterSeconds(error: HttpErrorResponse): number | null {
  const raw = error.headers?.get('Retry-After');
  if (raw == null) {
    return null;
  }
  const n = parseInt(String(raw).trim(), 10);
  if (Number.isFinite(n) && n >= 0) {
    return n;
  }
  return null;
}

/**
 * `400` with allauth `incorrect_code` (or `param: code`) on the login-by-code flow.
 */
export function isIncorrectCodeError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return false;
  }
  const body = error.error as { errors?: AllauthErrorItem[] } | undefined;
  if (!Array.isArray(body?.errors) || !body!.errors.length) {
    return false;
  }
  return body!.errors.some(
    (e) => e.code === 'incorrect_code' || (e.param as string | undefined) === 'code'
  );
}

/**
 * `400` + `incorrect_code` from WebAuthn / MFA validation (django-allauth maps parse/state failures
 * to this code — not necessarily an OTP “code”).
 */
export function isWebAuthnIncorrectCodeError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return false;
  }
  const body = error.error as { errors?: AllauthErrorItem[] } | undefined;
  if (!Array.isArray(body?.errors) || !body!.errors.length) {
    return false;
  }
  return body!.errors.some((e) => e.code === 'incorrect_code');
}

/** Headless/account actions blocked until email is verified (e.g. TOTP enrollment). */
export function isUnverifiedEmailError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }
  const httpStatus = error.status;
  const body = error.error;
  const bodyStatus =
    body && typeof body === 'object' && typeof (body as { status?: unknown }).status === 'number'
      ? (body as { status: number }).status
      : null;

  if (httpStatus !== 409 && bodyStatus !== 409) {
    return false;
  }

  const errors = (
    body as {
      errors?: AllauthErrorItem[];
    }
  )?.errors;
  if (!Array.isArray(errors) || !errors.length) {
    return false;
  }
  return errors.some((e) => e.code === 'unverified_email');
}

export function getErrorMessage(error: unknown): string | null {
  if (error instanceof HttpErrorResponse) {
    const m = firstAllauthMessage(error.error);
    if (m) {
      return m;
    }
    return error.error?.message ?? error.message;
  }
  return error instanceof Error ? error.message : null;
}

function firstAllauthMessage(body: unknown): string | null {
  const joined = extractAllauthErrorsMessages(body);
  return joined ?? null;
}

/** Join `errors[].message` when the JSON body matches an allauth error envelope (`status` + `errors`). */
export function extractAllauthErrorsMessages(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const o = body as Partial<ErrorResponse> & { status?: number; errors?: AllauthErrorItem[] };
  if (typeof o.status !== 'number' || !Array.isArray(o.errors) || !o.errors.length) {
    return undefined;
  }
  return joinAllauthErrors(o.errors);
}

export function joinAllauthErrors(errors: AllauthErrorItem[]): string {
  return errors
    .map((e) => e.message)
    .filter(Boolean)
    .join(' ');
}
