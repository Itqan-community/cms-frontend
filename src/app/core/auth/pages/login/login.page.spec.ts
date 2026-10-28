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
  let previousIsConditional: (() => Promise<boolean>) | undefined;
  let restoreIsConditional: boolean;

  beforeEach(async () => {
    passkeyEnvSnapshot = snapshotPasskeyEnvironment();
    restoreIsConditional = false;
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
    if (restoreIsConditional) {
      (
        PublicKeyCredential as unknown as {
          isConditionalMediationAvailable?: () => Promise<boolean>;
        }
      ).isConditionalMediationAvailable = previousIsConditional;
    }
    restorePasskeyEnvironment(passkeyEnvSnapshot);
  });

  function createFixture(): LoginPage {
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function setConditionalMediationAvailable(available: boolean | undefined): void {
    setPasskeyClientEnvironmentSupported(true);
    const pkc = PublicKeyCredential as unknown as {
      isConditionalMediationAvailable?: () => Promise<boolean>;
    };
    previousIsConditional = pkc.isConditionalMediationAvailable;
    restoreIsConditional = true;
    pkc.isConditionalMediationAvailable =
      available === undefined ? undefined : () => Promise.resolve(available);
  }

  it('starts passkey autofill on init when the browser supports it', async () => {
    setConditionalMediationAvailable(true);
    loginWithPasskey.and.returnValue(new Promise(() => undefined));
    const page = createFixture();
    await fixture.whenStable();
    expect(loginWithPasskey).toHaveBeenCalledWith('/gallery', {
      signal: jasmine.any(AbortSignal),
    });
    expect(page.passkeyLoading()).toBe(false);
  });

  it('does not prompt for a passkey on init when passkey autofill is unavailable', async () => {
    setConditionalMediationAvailable(false);
    createFixture();
    await fixture.whenStable();
    expect(loginWithPasskey).not.toHaveBeenCalled();
  });

  it('marks the email field for passkey autofill', () => {
    createFixture();
    const email = (fixture.nativeElement as HTMLElement).querySelector('#email');
    expect(email?.getAttribute('autocomplete')).toBe('username webauthn');
  });

  it('aborts pending passkey autofill before a manual passkey login', async () => {
    setConditionalMediationAvailable(true);
    loginWithPasskey.and.returnValues(
      new Promise(() => undefined),
      Promise.resolve({ ok: false, reason: 'cancelled' })
    );
    const page = createFixture();
    await fixture.whenStable();
    const autofillSignal = (loginWithPasskey.calls.first().args[1] as { signal: AbortSignal })
      .signal;
    await page.onPasskeyLogin();
    expect(autofillSignal.aborted).toBe(true);
    expect(loginWithPasskey.calls.mostRecent().args).toEqual(['/gallery']);
  });

  it('aborts pending passkey autofill on destroy', async () => {
    setConditionalMediationAvailable(true);
    loginWithPasskey.and.returnValue(new Promise(() => undefined));
    createFixture();
    await fixture.whenStable();
    const autofillSignal = (loginWithPasskey.calls.first().args[1] as { signal: AbortSignal })
      .signal;
    fixture.destroy();
    expect(autofillSignal.aborted).toBe(true);
  });

  it('does not set error when passkey autofill is aborted', async () => {
    const page = createFixture();
    loginWithPasskey.and.rejectWith(new DOMException('aborted', 'AbortError'));
    await page.onPasskeyLogin({ auto: true });
    expect(page.errorMessage()).toBe('');
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
    setConditionalMediationAvailable(true);
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
