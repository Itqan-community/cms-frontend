import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PasskeyPage } from './passkey.page';

describe('PasskeyPage', () => {
  let fixture: ComponentFixture<PasskeyPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasskeyPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            headlessAuth: {
              getWebauthnLoginOptions: () => {
                throw new Error('not used');
              },
              postWebauthnLogin: () => {
                throw new Error('not used');
              },
            },
            applyHeadlessSuccess: () => {
              throw new Error('not used');
            },
            applyMetaTokens: jasmine.createSpy('applyMetaTokens'),
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

  it('signup does not fetch WebAuthn options when initiate returns no session_token', async () => {
    localStorage.clear();
    const getWebauthnSignupOptions = jasmine.createSpy('getWebauthnSignupOptions');
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PasskeyPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            applyMetaTokens: jasmine.createSpy('applyMetaTokens'),
            applyHeadlessSuccess: () => of({}),
            headlessAuth: {
              initiatePasskeySignup: () =>
                of(
                  new HttpResponse({
                    status: 200,
                    body: { note: 'no meta.session_token' },
                  })
                ),
              getWebauthnSignupOptions,
            },
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
    expect(getWebauthnSignupOptions).not.toHaveBeenCalled();
    expect(page.errorMessage().length).toBeGreaterThan(0);
    expect(page.isLoading()).toBe(false);
  });
});
