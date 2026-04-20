import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';
import { PrivacyConsentService } from './privacy-consent.service';

@Injectable({
  providedIn: 'root',
})
export class SentryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly privacyConsentService = inject(PrivacyConsentService);
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    if (!environment.sentryDsn) return;
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.privacyConsentService.isErrorTrackingAllowed()) return;
    console.debug('[SentryService] Initializing Sentry...');
    this.initialized = true;

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
    });
  }
}
