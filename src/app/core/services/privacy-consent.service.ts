import { Injectable, signal } from '@angular/core';

export interface PrivacyConsent {
  analytics: boolean;
  errorTracking: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class PrivacyConsentService {
  private readonly STORAGE_KEY = 'privacy-consent';
  private readonly consentSignal = signal<PrivacyConsent | null>(null);

  /**
   * Get the current privacy consent preferences.
   * Falls back to default consent state if not set.
   */
  getConsent(): PrivacyConsent {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PrivacyConsent;
        this.consentSignal.set(parsed);
        return parsed;
      } catch {
        // Invalid JSON, fall back to default
      }
    }

    // Default: no consent given yet
    const defaultConsent: PrivacyConsent = {
      analytics: false,
      errorTracking: false,
      timestamp: Date.now(),
    };
    this.consentSignal.set(defaultConsent);
    return defaultConsent;
  }

  /**
   * Save the privacy consent preferences to localStorage.
   */
  setConsent(consent: PrivacyConsent): void {
    const updatedConsent = { ...consent, timestamp: Date.now() };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedConsent));
    this.consentSignal.set(updatedConsent);
  }

  /**
   * Check if analytics tracking is allowed.
   */
  isAnalyticsAllowed(): boolean {
    return this.getConsent().analytics;
  }

  /**
   * Check if error tracking is allowed.
   */
  isErrorTrackingAllowed(): boolean {
    return this.getConsent().errorTracking;
  }

  /**
   * Clear the stored consent preferences.
   */
  clearConsent(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.consentSignal.set(null);
  }

  /**
   * Get the consent signal for reactive updates.
   */
  getConsentSignal() {
    return this.consentSignal;
  }

  // TODO: When backend consent storage is available, sync authenticated user preferences to server and use backend as source of truth.
  // Keep localStorage as fallback for anonymous users.
}
