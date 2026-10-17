import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';
import { filterBenignNetworkSentryEvent } from './sentry-before-send.util';

/**
 * Starts Sentry error reporting. Called only once the visitor has consented
 * (see PrivacyConsentService); a no-op when no DSN is configured or Sentry is already running.
 */
export function startSentry(): void {
  if (!environment.sentryDsn) return;
  const client = Sentry.getClient();
  if (client && client.getOptions().enabled !== false) return;

  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'staging',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: environment.production ? 0.2 : 1.0,
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/.*\.api\.cms\.itqan\.dev/,
      /^https:\/\/api\.cms\.itqan\.dev/,
    ],
    beforeSend(event, hint) {
      return filterBenignNetworkSentryEvent(event, hint);
    },
  });
}

/** Stops sending events after the visitor withdraws consent. */
export function stopSentry(): void {
  const client = Sentry.getClient();
  if (!client) return;
  // close() only disables the client after flushing; stop capturing right away.
  client.getOptions().enabled = false;
  void Sentry.close();
}
