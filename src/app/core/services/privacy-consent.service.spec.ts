import { TestBed } from '@angular/core/testing';
import {
  PRIVACY_CONSENT_STORAGE_KEY,
  PRIVACY_CONSENT_VERSION,
  PrivacyConsentService,
  readStoredPrivacyConsent,
} from './privacy-consent.service';

describe('PrivacyConsentService', () => {
  beforeEach(() => {
    localStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY);
  });

  function storeRaw(value: unknown): void {
    localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(value));
  }

  describe('readStoredPrivacyConsent', () => {
    it('returns null when the visitor has not decided', () => {
      expect(readStoredPrivacyConsent()).toBeNull();
    });

    it('returns null for unreadable JSON', () => {
      localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, '{not json');

      expect(readStoredPrivacyConsent()).toBeNull();
    });

    it('ignores a choice recorded for an older policy version', () => {
      storeRaw({ version: PRIVACY_CONSENT_VERSION - 1, analytics: true, errorReporting: true });

      expect(readStoredPrivacyConsent()).toBeNull();
    });

    it('ignores a value with missing flags', () => {
      storeRaw({ version: PRIVACY_CONSENT_VERSION, analytics: true });

      expect(readStoredPrivacyConsent()).toBeNull();
    });

    it('returns a valid stored choice', () => {
      storeRaw({
        version: PRIVACY_CONSENT_VERSION,
        analytics: false,
        errorReporting: true,
        updatedAt: '2026-10-17T10:00:00.000Z',
      });

      expect(readStoredPrivacyConsent()).toEqual({
        version: PRIVACY_CONSENT_VERSION,
        analytics: false,
        errorReporting: true,
        updatedAt: '2026-10-17T10:00:00.000Z',
      });
    });
  });

  it('starts undecided when nothing is stored', () => {
    const service = TestBed.inject(PrivacyConsentService);

    expect(service.consent()).toBeNull();
    expect(service.reopened()).toBeFalse();
  });

  it('acceptAll allows both services and persists the choice', () => {
    const service = TestBed.inject(PrivacyConsentService);

    service.acceptAll();

    expect(service.consent()).toEqual(
      jasmine.objectContaining({ analytics: true, errorReporting: true })
    );
    expect(readStoredPrivacyConsent()).toEqual(
      jasmine.objectContaining({ analytics: true, errorReporting: true })
    );
  });

  it('rejectAll refuses both services and persists the choice', () => {
    const service = TestBed.inject(PrivacyConsentService);

    service.rejectAll();

    expect(service.consent()).toEqual(
      jasmine.objectContaining({ analytics: false, errorReporting: false })
    );
    expect(readStoredPrivacyConsent()).toEqual(
      jasmine.objectContaining({ analytics: false, errorReporting: false })
    );
  });

  it('save stores a partial choice with the current version and a timestamp', () => {
    const service = TestBed.inject(PrivacyConsentService);

    service.save({ analytics: false, errorReporting: true });

    const stored = readStoredPrivacyConsent();
    expect(stored?.version).toBe(PRIVACY_CONSENT_VERSION);
    expect(stored?.analytics).toBeFalse();
    expect(stored?.errorReporting).toBeTrue();
    expect(Number.isNaN(Date.parse(stored?.updatedAt ?? ''))).toBeFalse();
  });

  it('closes a reopened banner once the visitor saves again', () => {
    const service = TestBed.inject(PrivacyConsentService);
    service.acceptAll();

    service.reopen();
    expect(service.reopened()).toBeTrue();

    service.rejectAll();
    expect(service.reopened()).toBeFalse();
    expect(service.consent()?.analytics).toBeFalse();
  });

  it('picks up a choice made in another tab', () => {
    const service = TestBed.inject(PrivacyConsentService);
    service.acceptAll();

    storeRaw({ version: PRIVACY_CONSENT_VERSION, analytics: false, errorReporting: false });
    window.dispatchEvent(new StorageEvent('storage', { key: PRIVACY_CONSENT_STORAGE_KEY }));

    expect(service.consent()).toEqual(
      jasmine.objectContaining({ analytics: false, errorReporting: false })
    );
  });

  it('ignores storage events for other keys', () => {
    const service = TestBed.inject(PrivacyConsentService);
    service.acceptAll();

    storeRaw({ version: PRIVACY_CONSENT_VERSION, analytics: false, errorReporting: false });
    window.dispatchEvent(new StorageEvent('storage', { key: 'lang' }));

    expect(service.consent()?.analytics).toBeTrue();
  });

  it('still honours the choice for the session when storage is blocked', () => {
    const service = TestBed.inject(PrivacyConsentService);
    spyOn(Storage.prototype, 'setItem').and.throwError('QuotaExceededError');

    service.acceptAll();

    expect(service.consent()?.analytics).toBeTrue();
  });
});
