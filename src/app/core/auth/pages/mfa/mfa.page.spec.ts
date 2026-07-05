import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import * as webauthnCapability from '../../headless/webauthn-capability.util';
import { AuthService } from '../../services/auth.service';
import { MfaPage } from './mfa.page';

describe('MfaPage', () => {
  let fixture: ComponentFixture<MfaPage>;
  let getWebauthnMfaOptions: jasmine.Spy;
  let postWebauthnMfa: jasmine.Spy;
  let applyHeadlessSuccess: jasmine.Spy;

  beforeEach(async () => {
    getWebauthnMfaOptions = jasmine.createSpy('getWebauthnMfaOptions').and.returnValue(
      of({
        data: {
          request_options: {
            publicKey: {
              challenge: new Uint8Array([1, 2, 3]),
              rpId: 'localhost',
            },
          },
        },
      })
    );
    postWebauthnMfa = jasmine.createSpy('postWebauthnMfa');
    applyHeadlessSuccess = jasmine.createSpy('applyHeadlessSuccess').and.returnValue(of({}));
    spyOn(webauthnCapability, 'isPasskeyClientEnvironmentSupported').and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [MfaPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            headlessAuth: {
              getWebauthnMfaOptions,
              postWebauthnMfa,
              mfaAuthenticate: jasmine.createSpy('mfaAuthenticate'),
            },
            applyHeadlessSuccess,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    }).compileComponents();
  });

  function createFixture(): MfaPage {
    fixture = TestBed.createComponent(MfaPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('auto-calls getWebauthnMfaOptions on init when passkey is supported', async () => {
    (webauthnCapability.isPasskeyClientEnvironmentSupported as jasmine.Spy).and.returnValue(true);
    spyOn(navigator.credentials, 'get').and.resolveTo(null);
    getWebauthnMfaOptions.calls.reset();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MfaPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            headlessAuth: {
              getWebauthnMfaOptions,
              postWebauthnMfa,
              mfaAuthenticate: jasmine.createSpy('mfaAuthenticate'),
            },
            applyHeadlessSuccess,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MfaPage);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(getWebauthnMfaOptions).toHaveBeenCalled();
  });

  it('does not set error on auto-cancel when credentials.get returns null', async () => {
    (webauthnCapability.isPasskeyClientEnvironmentSupported as jasmine.Spy).and.returnValue(true);
    spyOn(navigator.credentials, 'get').and.resolveTo(null);
    const page = createFixture();
    await fixture.whenStable();
    expect(page.errorMessage()).toBe('');
  });

  it('sets error on manual cancel when credentials.get returns null', async () => {
    (webauthnCapability.isPasskeyClientEnvironmentSupported as jasmine.Spy).and.returnValue(true);
    const getCred = spyOn(navigator.credentials, 'get').and.resolveTo(null);
    const page = createFixture();
    await fixture.whenStable();
    expect(page.errorMessage()).toBe('');
    getCred.calls.reset();
    await page.onWebAuthn();
    expect(page.errorMessage().length).toBeGreaterThan(0);
  });

  it('silences user-cancelled DOMException on auto prompt', async () => {
    (webauthnCapability.isPasskeyClientEnvironmentSupported as jasmine.Spy).and.returnValue(true);
    spyOn(navigator.credentials, 'get').and.rejectWith(
      new DOMException('not allowed', 'NotAllowedError')
    );
    const page = createFixture();
    await fixture.whenStable();
    expect(page.errorMessage()).toBe('');
  });
});
