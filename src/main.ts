import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import * as Sentry from '@sentry/angular';
import { environment } from './environments/environment';
import { CHUNK_LOAD_RECOVERY_FLAG } from './app/core/sentry/chunk-load-error.util';
import { filterBenignNetworkSentryEvent } from './app/core/sentry/sentry-before-send.util';

if (environment.sentryDsn) {
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

bootstrapApplication(App, appConfig)
  .then(() => {
    // Successful boot: allow a future chunk-load failure in this tab to recover once.
    try {
      sessionStorage.removeItem(CHUNK_LOAD_RECOVERY_FLAG);
    } catch {
      /* ignore */
    }
  })
  .catch((err) => console.error(err));
