import { ErrorHandler } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { tryRecoverFromChunkLoadError } from './chunk-load-error.util';

/**
 * Recovers from lazy-chunk / module-import failures with a one-time reload,
 * then delegates remaining errors to Sentry's Angular ErrorHandler.
 */
export function createAppSentryErrorHandler(): ErrorHandler {
  const sentryHandler = Sentry.createErrorHandler();

  return {
    handleError(error: unknown): void {
      if (tryRecoverFromChunkLoadError(error)) {
        return;
      }
      sentryHandler.handleError(error);
    },
  };
}
