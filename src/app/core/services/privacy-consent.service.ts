import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** localStorage key holding the visitor's privacy choices. */
export const PRIVACY_CONSENT_STORAGE_KEY = 'cms.privacyConsent';

/**
 * Bump when the privacy page changes in a way that needs fresh consent:
 * stored choices with an older version are ignored and the banner shows again.
 */
export const PRIVACY_CONSENT_VERSION = 1;

export interface PrivacyConsentChoices {
  /** Google Analytics (production only). */
  analytics: boolean;
  /** Sentry error reports. */
  errorReporting: boolean;
}

export interface PrivacyConsent extends PrivacyConsentChoices {
  version: number;
  /** ISO timestamp of the last decision. */
  updatedAt: string;
}

/**
 * Reads the stored decision. Returns `null` when the visitor has not decided yet,
 * the stored value is unreadable, or it was recorded for an older policy version.
 * Exported separately so `main.ts` can check it before Angular bootstraps.
 */
export function readStoredPrivacyConsent(): PrivacyConsent | null {
  try {
    const raw = localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PrivacyConsent>;
    if (
      parsed?.version !== PRIVACY_CONSENT_VERSION ||
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.errorReporting !== 'boolean'
    ) {
      return null;
    }
    return {
      version: parsed.version,
      analytics: parsed.analytics,
      errorReporting: parsed.errorReporting,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class PrivacyConsentService {
  private readonly consentState = signal<PrivacyConsent | null>(readStoredPrivacyConsent());
  private readonly reopenedState = signal(false);

  /** Current decision, or `null` while the visitor has not decided. */
  readonly consent = this.consentState.asReadonly();

  /** True when the visitor asked to review their choices again (e.g. from the privacy page). */
  readonly reopened = this.reopenedState.asReadonly();

  constructor() {
    // A choice made in another tab applies here too, so withdrawn consent stops tracking everywhere.
    const onStorage = (event: StorageEvent): void => {
      if (event.key === PRIVACY_CONSENT_STORAGE_KEY || event.key === null) {
        this.consentState.set(readStoredPrivacyConsent());
      }
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  /** Allows analytics and error reporting. */
  acceptAll(): void {
    this.save({ analytics: true, errorReporting: true });
  }

  /** Refuses analytics and error reporting. */
  rejectAll(): void {
    this.save({ analytics: false, errorReporting: false });
  }

  /** Records the visitor's choice, persists it, and closes a reopened banner. */
  save(choices: PrivacyConsentChoices): void {
    const consent: PrivacyConsent = {
      version: PRIVACY_CONSENT_VERSION,
      analytics: choices.analytics,
      errorReporting: choices.errorReporting,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(consent));
    } catch {
      // Storage blocked (private mode, quota): honour the choice for this session only.
    }
    this.consentState.set(consent);
    this.reopenedState.set(false);
  }

  /** Shows the consent banner again so the visitor can change or withdraw consent. */
  reopen(): void {
    this.reopenedState.set(true);
  }
}
