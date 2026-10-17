import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { App } from './app';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import {
  PRIVACY_CONSENT_STORAGE_KEY,
  PrivacyConsentService,
} from './core/services/privacy-consent.service';

describe('App', () => {
  let analytics: jasmine.SpyObj<GoogleAnalyticsService>;

  beforeEach(async () => {
    localStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY);
    analytics = jasmine.createSpyObj<GoogleAnalyticsService>('GoogleAnalyticsService', [
      'init',
      'disable',
    ]);
    await TestBed.configureTestingModule({
      imports: [App, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: GoogleAnalyticsService, useValue: analytics },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('does not start analytics before the visitor decides', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(analytics.init).not.toHaveBeenCalled();
  });

  it('starts analytics once the visitor accepts', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    TestBed.inject(PrivacyConsentService).acceptAll();
    fixture.detectChanges();

    expect(analytics.init).toHaveBeenCalled();
  });

  it('turns analytics off when the visitor withdraws consent', () => {
    const fixture = TestBed.createComponent(App);
    const consent = TestBed.inject(PrivacyConsentService);
    consent.acceptAll();
    fixture.detectChanges();

    consent.save({ analytics: false, errorReporting: false });
    fixture.detectChanges();

    expect(analytics.disable).toHaveBeenCalled();
  });
});
