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
  if (!body || typeof body !== 'object') {
    return null;
  }
  const er = body as ErrorResponse;
  if (er.status === 400 && Array.isArray(er.errors) && er.errors.length) {
    return joinAllauthErrors(er.errors);
  }
  return null;
}

export function joinAllauthErrors(errors: AllauthErrorItem[]): string {
  return errors
    .map((e) => e.message)
    .filter(Boolean)
    .join(' ');
}
