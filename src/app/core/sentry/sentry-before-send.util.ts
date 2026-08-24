import { HttpErrorResponse } from '@angular/common/http';
import type { ErrorEvent, EventHint } from '@sentry/angular';
import { isChunkLoadError } from './chunk-load-error.util';

const STATUS_ZERO_HTTP_MESSAGE = /Http failure response for [^:]+: 0(?:\s+Unknown Error)?/i;

const OBJECT_CAPTURED_STATUS_KEYS = /Object captured as exception with keys:.*\bstatus\b/i;

function eventExceptionMessages(event: ErrorEvent): string[] {
  const values = event.exception?.values ?? [];
  const fromException = values
    .map((v) => [v.value, v.type].filter(Boolean).join(' '))
    .filter((s): s is string => !!s);
  if (typeof event.message === 'string' && event.message) {
    return [...fromException, event.message];
  }
  return fromException;
}

function isStatusZeroNetworkFailure(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) {
    return error.status === 0;
  }
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status?: unknown }).status === 0;
  }
  return false;
}

function isBenignNetworkNoiseMessage(message: string): boolean {
  if (STATUS_ZERO_HTTP_MESSAGE.test(message)) {
    return true;
  }
  if (OBJECT_CAPTURED_STATUS_KEYS.test(message) && /\bstatus\b/i.test(message)) {
    // Plain-object capture of aborted XHR/fetch shapes (status 0 / network abort).
    // Only drop when the captured-keys list looks like an HTTP response object.
    return /\bok\b/i.test(message) && (/\burl\b/i.test(message) || /\bstatusText\b/i.test(message));
  }
  return false;
}

/**
 * Drop benign mobile/WebKit network abort and chunk-import failures from Sentry.
 * Returns null to discard; otherwise returns the event unchanged.
 */
export function filterBenignNetworkSentryEvent(
  event: ErrorEvent,
  hint?: EventHint
): ErrorEvent | null {
  const original = hint?.originalException;

  if (isChunkLoadError(original)) {
    return null;
  }
  if (isStatusZeroNetworkFailure(original)) {
    return null;
  }

  for (const msg of eventExceptionMessages(event)) {
    if (isChunkLoadError(msg) || isBenignNetworkNoiseMessage(msg)) {
      return null;
    }
  }

  return event;
}
