import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { PasskeyAuthFlowService } from '../../headless/passkey-auth.flow';
import { PasskeyPage } from './passkey.page';

describe('PasskeyPage', () => {
  let fixture: ComponentFixture<PasskeyPage>;
  let signupWithPasskey: jasmine.Spy;

  beforeEach(async () => {
    signupWithPasskey = jasmine.createSpy('signupWithPasskey');
    await TestBed.configureTestingModule({
      imports: [PasskeyPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: PasskeyAuthFlowService,
          useValue: {
            loginWithPasskey: jasmine.createSpy('loginWithPasskey'),
            signupWithPasskey,
          },
        },
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            applyMetaTokens: jasmine.createSpy('applyMetaTokens'),
            headlessAuth: {},
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {},
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PasskeyPage);
    fixture.detectChanges();
  });

  it('creates and sets passkeyAvailable from environment', () => {
    expect(fixture.componentInstance.passkeyAvailable()).toBeDefined();
  });

  it('shows signup session error when flow service returns signup_session_missing', async () => {
    signupWithPasskey.and.resolveTo({ ok: false, reason: 'signup_session_missing' });
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PasskeyPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: PasskeyAuthFlowService,
          useValue: {
            loginWithPasskey: jasmine.createSpy('loginWithPasskey'),
            signupWithPasskey,
          },
        },
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            applyMetaTokens: jasmine.createSpy('applyMetaTokens'),
            headlessAuth: {},
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {},
              queryParamMap: {
                get: (k: string) => (k === 'flow' ? 'signup' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(PasskeyPage);
    f.detectChanges();
    const page = f.componentInstance;
    page.signupForm.patchValue({ email: 'user@example.com' });
    await page.submitPasskey();
    expect(signupWithPasskey).toHaveBeenCalledWith('user@example.com', '/gallery');
    expect(page.errorMessage().length).toBeGreaterThan(0);
    expect(page.isLoading()).toBe(false);
  });
});
