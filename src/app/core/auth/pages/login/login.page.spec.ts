import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import * as passkeyAutoPrompt from '../../headless/passkey-auto-prompt.util';
import { PasskeyAuthFlowService } from '../../headless/passkey-auth.flow';
import { AuthService } from '../../services/auth.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let loginWithPasskey: jasmine.Spy;

  beforeEach(async () => {
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

  function createFixture(): LoginPage {
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('auto-calls loginWithPasskey on init when passkey auto-prompt is supported', async () => {
    spyOn(passkeyAutoPrompt, 'shouldAttemptPasskeyAutoPrompt').and.returnValue(true);
    loginWithPasskey.and.resolveTo({ ok: false, reason: 'cancelled' });
    createFixture();
    await fixture.whenStable();
    expect(loginWithPasskey).toHaveBeenCalledWith('/gallery');
  });

  it('does not set error on auto-cancel', async () => {
    spyOn(passkeyAutoPrompt, 'shouldAttemptPasskeyAutoPrompt').and.returnValue(false);
    const page = createFixture();
    loginWithPasskey.and.resolveTo({ ok: false, reason: 'cancelled' });
    await page.onPasskeyLogin({ auto: true });
    expect(page.errorMessage()).toBe('');
  });

  it('sets error on manual cancel', async () => {
    spyOn(passkeyAutoPrompt, 'shouldAttemptPasskeyAutoPrompt').and.returnValue(false);
    const page = createFixture();
    loginWithPasskey.and.resolveTo({ ok: false, reason: 'cancelled' });
    await page.onPasskeyLogin();
    expect(page.errorMessage().length).toBeGreaterThan(0);
  });

  it('does not auto-prompt when already logged in', async () => {
    spyOn(passkeyAutoPrompt, 'shouldAttemptPasskeyAutoPrompt').and.returnValue(true);
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
