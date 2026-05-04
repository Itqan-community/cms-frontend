import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { HeadlessAuthApiService } from '../headless/headless-auth-api.service';
import type { AuthenticatedOrChallenge } from '../headless/headless-auth-api.service';
import { HeadlessAppTokenService } from '../headless/headless-app-token.service';
import type { AuthenticatedResponse, ConfigurationResponse } from '../headless/headless-api.types';

const mockUser = {
  id: 1,
  display: 'Test',
  has_usable_password: true,
  email: 't@example.com',
};

function authedResponse(): AuthenticatedResponse {
  return {
    status: 200,
    data: { user: mockUser, methods: [] },
    meta: { is_authenticated: true },
  };
}

describe('AuthService (app / headless)', () => {
  let service: AuthService;
  let headless: jasmine.SpyObj<HeadlessAuthApiService>;
  let tokenStore: HeadlessAppTokenService;
  let routerMock: {
    url: string;
    navigate: jasmine.Spy;
    navigateByUrl: jasmine.Spy;
    parseUrl: jasmine.Spy;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    headless = jasmine.createSpyObj<HeadlessAuthApiService>('HeadlessAuthApiService', [
      'getConfig',
      'getBrowserConfig',
      'getAuth',
      'getSession',
      'getBrowserSession',
      'login',
      'signup',
      'deleteSession',
      'verifyEmail',
      'redirectToProvider',
    ]);
    const mockConfig: ConfigurationResponse = {
      status: 200,
      data: {
        account: {
          authentication_method: 'email',
          is_open_for_signup: true,
          email_verification_by_code_enabled: false,
          login_by_code_enabled: false,
        },
      },
    };
    headless.getConfig.and.returnValue(of(mockConfig));
    headless.getAuth.and.returnValue(
      of({
        status: 200,
        data: { user: mockUser, methods: [] },
        meta: { is_authenticated: true },
      } as AuthenticatedResponse)
    );
    headless.getSession.and.returnValue(
      of({
        status: 200,
        data: { user: mockUser, methods: [] },
        meta: { is_authenticated: true },
      } as AuthenticatedResponse)
    );
    headless.getBrowserSession.and.returnValue(
      of({
        status: 200,
        data: { user: mockUser, methods: [] },
        meta: { is_authenticated: true },
      } as AuthenticatedResponse)
    );
    headless.redirectToProvider.and.returnValue(Promise.resolve({ kind: 'json', body: {} }));
    headless.getBrowserConfig.and.returnValue(
      of({
        status: 200,
        data: {
          account: {
            authentication_method: 'email',
            is_open_for_signup: true,
            email_verification_by_code_enabled: false,
            login_by_code_enabled: false,
          },
        },
      } as ConfigurationResponse),
    );
    routerMock = {
      url: '/account/login?next=%2Faccount%2Fproviders',
      navigate: jasmine.createSpy('navigate'),
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
      parseUrl: jasmine
        .createSpy('parseUrl')
        .and.returnValue({ queryParams: { next: '/account/providers' } }),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: { get: () => of({ id: 1 }), put: () => of({}) } },
        { provide: Router, useValue: routerMock },
        { provide: HeadlessAuthApiService, useValue: headless },
      ],
    });
    service = TestBed.inject(AuthService);
    tokenStore = TestBed.inject(HeadlessAppTokenService);
  });

  it('applyMetaTokens persists session_token, access_token and refresh_token', () => {
    service.applyMetaTokens({
      is_authenticated: true,
      session_token: 'sess-1',
      access_token: 'acc-1',
      refresh_token: 'ref-1',
    });
    expect(tokenStore.getSessionToken()).toBe('sess-1');
    expect(tokenStore.getAccessToken()).toBe('acc-1');
    expect(tokenStore.getRefreshToken()).toBe('ref-1');
  });

  it('applyHeadlessSuccess does not call getSession when user and access_token are present', (done) => {
    const first: AuthenticatedResponse = {
      status: 200,
      data: { user: mockUser, methods: [] },
      meta: { is_authenticated: true, access_token: 'a', session_token: 's' },
    };
    const sessionCalls = headless.getSession.calls.count();
    service.applyHeadlessSuccess(first, { fetchProfile: false }).subscribe(() => {
      expect(headless.getSession.calls.count()).toBe(sessionCalls);
      expect(tokenStore.getAccessToken()).toBe('a');
      expect(tokenStore.getSessionToken()).toBe('s');
      done();
    });
  });

  it('applyHeadlessSuccess fetches session when authenticated but user missing in first response', (done) => {
    const first = {
      status: 200,
      data: { methods: [] },
      meta: { is_authenticated: true },
    } as unknown as AuthenticatedResponse;
    let calls = 0;
    headless.getSession.and.callFake(() => {
      calls++;
      return of(authedResponse());
    });

    service.applyHeadlessSuccess(first, { fetchProfile: false }).subscribe(() => {
      expect(calls).toBeGreaterThan(0);
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('sessionRecheckAfter401 returns true and updates state when getSession is authenticated', (done) => {
    headless.getSession.and.returnValue(of(authedResponse()));
    service.sessionRecheckAfter401().subscribe((ok) => {
      expect(ok).toBe(true);
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('sessionRecheckAfter401 returns false on getSession error', (done) => {
    headless.getSession.and.returnValue(throwError(() => new Error('net')));
    service.sessionRecheckAfter401().subscribe((ok) => {
      expect(ok).toBe(false);
      done();
    });
  });

  it('startGoogleOAuth does not call redirectToProvider when oauthBrowserRedirectEnabled is false', async () => {
    await service.startGoogleOAuth('http://localhost/cb', 'login');
    expect(headless.redirectToProvider).not.toHaveBeenCalled();
  });

  it('startGoogleOAuth with login clears stale session token before redirect', async () => {
    (service as { oauthBrowserRedirectEnabled: boolean }).oauthBrowserRedirectEnabled = true;
    tokenStore.setSessionToken('stale-token');
    headless.redirectToProvider.and.returnValue(
      Promise.resolve({ kind: 'error', message: 'backend refused' })
    );
    await service.startGoogleOAuth('http://localhost/cb', 'login');
    expect(tokenStore.getSessionToken()).toBeNull();
    expect(headless.redirectToProvider).toHaveBeenCalled();
  });

  it('LOGGED_IN auth event navigates to query next URL when not on OAuth callback', async () => {
    const fn = (service as unknown as { handleAuthChangeEvent: Function }).handleAuthChangeEvent;
    await fn.call(service, 'LOGGED_IN', {});
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/account/providers');
  });

  it('LOGGED_IN defers navigation when on provider OAuth callback route', async () => {
    routerMock.url = '/account/provider/callback?next=%2Fgallery';
    routerMock.parseUrl.and.returnValue({ queryParams: { next: '/gallery' } });
    routerMock.navigateByUrl.calls.reset();
    const fn = (service as unknown as { handleAuthChangeEvent: Function }).handleAuthChangeEvent;
    await fn.call(service, 'LOGGED_IN', {});
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('bootstrapSessionAfterOAuthRedirect skips browser when app session is established', (done) => {
    headless.getSession.and.returnValue(of(authedResponse()));
    headless.getBrowserSession.calls.reset();
    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe(() => {
      expect(headless.getBrowserSession).not.toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('bootstrapSessionAfterOAuthRedirect unwraps HTTP 401 on app session then uses browser session', (done) => {
    headless.getSession.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: {
              status: 401,
              data: { methods: [] },
              meta: { is_authenticated: false },
            },
          }),
      ),
    );
    headless.getBrowserSession.calls.reset();
    headless.getBrowserSession.and.returnValue(of(authedResponse()));
    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe(() => {
      expect(headless.getBrowserSession).toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('bootstrapSessionAfterOAuthRedirect unwraps bare HTTP 401 on app session (no JSON body)', (done) => {
    headless.getSession.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    headless.getBrowserSession.calls.reset();
    headless.getBrowserSession.and.returnValue(of(authedResponse()));
    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe(() => {
      expect(headless.getBrowserSession).toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('bootstrapSessionAfterOAuthRedirect uses browser session when app anonymous', (done) => {
    const anonymous = {
      status: 200,
      data: { methods: [] },
      meta: { is_authenticated: false },
    } as unknown as AuthenticatedResponse;
    headless.getSession.and.returnValue(of(anonymous));
    headless.getBrowserSession.and.returnValue(of(authedResponse()));
    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe(() => {
      expect(headless.getBrowserSession).toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('bootstrapSessionAfterOAuthRedirect prefers browser 401+user over anonymous app session', (done) => {
    headless.getSession.and.returnValue(
      of({
        status: 401,
        data: { flows: [], methods: [] },
        meta: { is_authenticated: false },
      } as unknown as AuthenticatedOrChallenge),
    );
    headless.getBrowserSession.calls.reset();
    const browserContinuation = {
      status: 401,
      meta: { is_authenticated: true },
      data: { user: mockUser, flows: [], methods: [] },
    } as unknown as AuthenticatedOrChallenge;
    headless.getBrowserSession.and.returnValue(of(browserContinuation));
    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe((env) => {
      expect(headless.getBrowserSession).toHaveBeenCalled();
      expect(env.status).toBe(401);
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });
});
