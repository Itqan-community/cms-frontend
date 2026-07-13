import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PasskeyAuthFlowService } from './passkey-auth.flow';
import { HeadlessAppTokenService } from './headless-app-token.service';
import { AuthService } from '../services/auth.service';

describe('PasskeyAuthFlowService', () => {
  let service: PasskeyAuthFlowService;
  let getWebauthnLoginOptions: jasmine.Spy;
  let postWebauthnLogin: jasmine.Spy;
  let applyHeadlessSuccess: jasmine.Spy;
  let blockSessionCookieFallback: jasmine.Spy;

  beforeEach(() => {
    getWebauthnLoginOptions = jasmine.createSpy('getWebauthnLoginOptions').and.returnValue(
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
    postWebauthnLogin = jasmine.createSpy('postWebauthnLogin').and.returnValue(of({ status: 200 }));
    applyHeadlessSuccess = jasmine.createSpy('applyHeadlessSuccess').and.returnValue(of({}));
    blockSessionCookieFallback = jasmine.createSpy('blockSessionCookieFallback');

    TestBed.configureTestingModule({
      providers: [
        PasskeyAuthFlowService,
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            applyMetaTokens: jasmine.createSpy('applyMetaTokens'),
            applyHeadlessSuccess,
            headlessAuth: {
              getWebauthnLoginOptions,
              postWebauthnLogin,
              initiatePasskeySignup: jasmine.createSpy('initiatePasskeySignup'),
              getWebauthnSignupOptions: jasmine.createSpy('getWebauthnSignupOptions'),
              completePasskeySignup: jasmine.createSpy('completePasskeySignup'),
            },
          },
        },
        {
          provide: HeadlessAppTokenService,
          useValue: {
            blockSessionCookieFallback,
            getSessionToken: () => 'token',
          },
        },
      ],
    });
    service = TestBed.inject(PasskeyAuthFlowService);
  });

  it('blocks stale session cookie before login options', async () => {
    const pkc = PublicKeyCredential as unknown as {
      parseRequestOptionsFromJSON?: unknown;
    };
    const previousParser = pkc.parseRequestOptionsFromJSON;
    pkc.parseRequestOptionsFromJSON = undefined;
    spyOn(navigator.credentials, 'get').and.resolveTo(null);
    try {
      const result = await service.loginWithPasskey('/gallery');
      expect(blockSessionCookieFallback).toHaveBeenCalled();
      expect(getWebauthnLoginOptions).toHaveBeenCalled();
      expect(result).toEqual({ ok: false, reason: 'cancelled' });
    } finally {
      pkc.parseRequestOptionsFromJSON = previousParser;
    }
  });

  it('signup does not fetch WebAuthn options when initiate returns no session_token', async () => {
    const getWebauthnSignupOptions = jasmine.createSpy('getWebauthnSignupOptions');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PasskeyAuthFlowService,
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            applyMetaTokens: jasmine.createSpy('applyMetaTokens'),
            applyHeadlessSuccess,
            headlessAuth: {
              initiatePasskeySignup: () =>
                of({
                  ok: true,
                  body: { note: 'no meta.session_token' },
                }),
              getWebauthnSignupOptions,
            },
          },
        },
        {
          provide: HeadlessAppTokenService,
          useValue: {
            blockSessionCookieFallback,
            getSessionToken: () => null,
          },
        },
      ],
    });
    service = TestBed.inject(PasskeyAuthFlowService);
    const result = await service.signupWithPasskey('user@example.com', '/gallery');
    expect(getWebauthnSignupOptions).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, reason: 'signup_session_missing' });
  });
});
