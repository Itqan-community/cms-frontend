import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { CHUNK_LOAD_RECOVERY_FLAG } from './app/core/sentry/chunk-load-error.util';
import { startSentry } from './app/core/sentry/sentry-init';
import { readStoredPrivacyConsent } from './app/core/services/privacy-consent.service';

// Error reporting starts before bootstrap only for visitors who already consented;
// first-time visitors are handled by PrivacyConsentService once they decide.
if (readStoredPrivacyConsent()?.errorReporting) {
  startSentry();
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
