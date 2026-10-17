import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  PRIVACY_CONSENT_STORAGE_KEY,
  PrivacyConsentService,
} from '../../core/services/privacy-consent.service';
import { PrivacyPage } from './privacy.page';

describe('PrivacyPage', () => {
  beforeEach(async () => {
    localStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [PrivacyPage, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY);
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(PrivacyPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('discloses every service, including Web Vitals', () => {
    const text = render().textContent ?? '';

    expect(text).toContain('PRIVACY_PAGE.OPTIONAL.ANALYTICS');
    expect(text).toContain('PRIVACY_PAGE.OPTIONAL.ERROR_REPORTING');
    expect(text).toContain('PRIVACY_PAGE.NOT_SENT.WEB_VITALS');
  });

  it('says nothing optional runs before a choice', () => {
    expect(render().textContent).toContain('PRIVACY_PAGE.CHOICES.NONE');
  });

  it('shows the stored choice', () => {
    TestBed.inject(PrivacyConsentService).save({ analytics: true, errorReporting: false });

    const items = Array.from(render().querySelectorAll('.privacy-page__list strong')).map((el) =>
      el.textContent?.trim()
    );

    expect(items).toEqual(['PRIVACY_PAGE.CHOICES.ALLOWED', 'PRIVACY_PAGE.CHOICES.NOT_ALLOWED']);
  });

  it('reopens the consent banner from the change button', () => {
    const consent = TestBed.inject(PrivacyConsentService);
    consent.rejectAll();

    render().querySelector<HTMLButtonElement>('button[nz-button]')?.click();

    expect(consent.reopened()).toBeTrue();
  });
});
