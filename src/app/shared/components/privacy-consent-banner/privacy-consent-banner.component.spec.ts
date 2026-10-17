import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  PRIVACY_CONSENT_STORAGE_KEY,
  PrivacyConsentService,
} from '../../../core/services/privacy-consent.service';
import { PrivacyConsentBannerComponent } from './privacy-consent-banner.component';

describe('PrivacyConsentBannerComponent', () => {
  let fixture: ComponentFixture<PrivacyConsentBannerComponent>;
  let service: PrivacyConsentService;

  beforeEach(async () => {
    localStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [PrivacyConsentBannerComponent, TranslateModule.forRoot()],
      providers: [provideRouter([]), provideNoopAnimations()],
    }).compileComponents();

    service = TestBed.inject(PrivacyConsentService);
    fixture = TestBed.createComponent(PrivacyConsentBannerComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY);
  });

  function banner(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.privacy-banner');
  }

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function clickButton(label: string): Promise<void> {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button[nz-button]') as NodeListOf<HTMLButtonElement>
    );
    const button = buttons.find((b) => b.textContent?.trim() === label);
    if (!button) throw new Error(`No button labelled ${label}`);
    button.click();
    await render();
  }

  function switchFor(testId: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"] button`);
  }

  function isOn(testId: string): boolean {
    return switchFor(testId).classList.contains('ant-switch-checked');
  }

  async function toggle(testId: string): Promise<void> {
    switchFor(testId).click();
    await render();
  }

  it('shows on a first visit, before any choice', () => {
    expect(banner()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.privacy-banner__options')).toBeNull();
  });

  it('hides and records consent after Accept all', async () => {
    await clickButton('PRIVACY_CONSENT.ACCEPT_ALL');

    expect(banner()).toBeNull();
    expect(service.consent()).toEqual(
      jasmine.objectContaining({ analytics: true, errorReporting: true })
    );
  });

  it('hides and records refusal after Reject all', async () => {
    await clickButton('PRIVACY_CONSENT.REJECT_ALL');

    expect(banner()).toBeNull();
    expect(service.consent()).toEqual(
      jasmine.objectContaining({ analytics: false, errorReporting: false })
    );
  });

  it('offers per-service switches that start switched off', async () => {
    await clickButton('PRIVACY_CONSENT.CUSTOMIZE');

    expect(isOn('privacy-analytics-switch')).toBeFalse();
    expect(isOn('privacy-error-reporting-switch')).toBeFalse();
  });

  it('saves only the services the visitor switched on', async () => {
    await clickButton('PRIVACY_CONSENT.CUSTOMIZE');
    await toggle('privacy-error-reporting-switch');

    await clickButton('PRIVACY_CONSENT.SAVE_CHOICES');

    expect(banner()).toBeNull();
    expect(service.consent()).toEqual(
      jasmine.objectContaining({ analytics: false, errorReporting: true })
    );
  });

  it('reopens with the stored choices so consent can be changed or withdrawn', async () => {
    service.save({ analytics: true, errorReporting: false });
    await render();
    expect(banner()).toBeNull();

    service.reopen();
    await render();

    expect(banner()).not.toBeNull();
    expect(isOn('privacy-analytics-switch')).toBeTrue();
    expect(isOn('privacy-error-reporting-switch')).toBeFalse();

    await toggle('privacy-analytics-switch');
    await clickButton('PRIVACY_CONSENT.SAVE_CHOICES');

    expect(banner()).toBeNull();
    expect(service.consent()?.analytics).toBeFalse();
  });
});
