import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import * as Sentry from '@sentry/angular';
import { environment } from './environments/environment';

if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'staging',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: environment.production ? 0.2 : 1.0,
    tracePropagationTargets: ['localhost'],
  });
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
