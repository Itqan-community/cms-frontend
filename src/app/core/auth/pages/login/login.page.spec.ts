import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  restorePasskeyEnvironment,
  setPasskeyClientEnvironmentSupported,
  snapshotPasskeyEnvironment,
  type PasskeyEnvironmentSnapshot,
} from '../../headless/passkey-test-env.helper';
import { PasskeyAuthFlowService } from '../../headless/passkey-auth.flow';
import { AuthService } from '../../services/auth.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let loginWithPasskey: jasmine.Spy;
  let passkeyEnvSnapshot: PasskeyEnvironmentSnapshot;

  beforeEach(async () => {
    passkeyEnvSnapshot = snapshotPasskeyEnvironment();
    setPasskeyClientEnvironmentSupported(false);
    loginWithPasskey = jasmine.createSpy('loginWithPasskey');
    await TestBed.configureTestingModule({
      imports: [LoginPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: PasskeyAuthFlowService,
          useValue: { loginWithPasskey },
        },
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            isLoading: signal(false),
            authConfig: () => null,
            login: jasmine.createSpy('login'),
            startGoogleOAuth: jasmine.createSpy('startGoogleOAuth'),
            startGitHubOAuth: jasmine.createSpy('startGitHubOAuth'),
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

  afterEach(() => {
    restorePasskeyEnvironment(passkeyEnvSnapshot);
  });

  function createFixture(): LoginPage {
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('auto-calls loginWithPasskey on init when passkey auto-prompt is supported', async () => {
    setPasskeyClientEnvironmentSupported(true);
    loginWithPasskey.and.resolveTo({ ok: false, reason: 'cancelled' });
    createFixture();
    await fixture.whenStable();
    expect(loginWithPasskey).toHaveBeenCalledWith('/gallery');
  });

  it('does not set error on auto-cancel', async () => {
    const page = createFixture();
    loginWithPasskey.and.resolveTo({ ok: false, reason: 'cancelled' });
    await page.onPasskeyLogin({ auto: true });
    expect(page.errorMessage()).toBe('');
  });

  it('sets error on manual cancel', async () => {
    const page = createFixture();
    loginWithPasskey.and.resolveTo({ ok: false, reason: 'cancelled' });
    await page.onPasskeyLogin();
    expect(page.errorMessage().length).toBeGreaterThan(0);
  });

  it('does not auto-prompt when already logged in', async () => {
    setPasskeyClientEnvironmentSupported(true);
    loginWithPasskey.calls.reset();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LoginPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: PasskeyAuthFlowService,
          useValue: { loginWithPasskey },
        },
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => true,
            isLoading: signal(false),
            authConfig: () => null,
            login: jasmine.createSpy('login'),
            startGoogleOAuth: jasmine.createSpy('startGoogleOAuth'),
            startGitHubOAuth: jasmine.createSpy('startGitHubOAuth'),
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
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    expect(loginWithPasskey).not.toHaveBeenCalled();
  });
});
