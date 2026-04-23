import { HttpErrorResponse } from '@angular/common/http';
import type { AllauthErrorItem, ErrorResponse } from '../../core/auth/headless/headless-api.types';

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
