import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { HeadlessAuthApiService } from '../headless/headless-auth-api.service';
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

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    headless = jasmine.createSpyObj<HeadlessAuthApiService>('HeadlessAuthApiService', [
      'getConfig',
      'getAuth',
      'getSession',
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
    headless.redirectToProvider.and.returnValue(Promise.resolve({ kind: 'json', body: {} }));

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: { get: () => of({ id: 1 }), put: () => of({}) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
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

});
