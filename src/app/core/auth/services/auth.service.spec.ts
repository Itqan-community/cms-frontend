import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { HeadlessAuthApiService } from '../headless/headless-auth-api.service';
import {
  HeadlessAppTokenService,
  HEADLESS_ACCESS_TOKEN_KEY,
  HEADLESS_REFRESH_TOKEN_KEY,
  HEADLESS_SESSION_TOKEN_KEY,
} from '../headless/headless-app-token.service';
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
    localStorage.clear();
    headless = jasmine.createSpyObj<HeadlessAuthApiService>('HeadlessAuthApiService', [
      'getConfig',
      'getSession',
      'login',
      'signup',
      'deleteSession',
      'verifyEmail',
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
    headless.getSession.and.returnValue(
      of({
        status: 200,
        data: { user: mockUser, methods: [] },
        meta: { is_authenticated: true },
      } as AuthenticatedResponse)
    );

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
    expect(localStorage.getItem(HEADLESS_SESSION_TOKEN_KEY)).toBe('sess-1');
    expect(localStorage.getItem(HEADLESS_ACCESS_TOKEN_KEY)).toBe('acc-1');
    expect(localStorage.getItem(HEADLESS_REFRESH_TOKEN_KEY)).toBe('ref-1');
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

  it('applyHeadlessSuccess fetches session when authenticated but no access_token in first response', (done) => {
    const first: AuthenticatedResponse = {
      status: 200,
      data: { user: mockUser, methods: [] },
      meta: { is_authenticated: true },
    };
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

  it('restores authenticated UI state from storage when bootstrap session check fails', () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: '1',
        name: 'Persisted User',
        email: 'persisted@example.com',
        phone: '',
        is_active: true,
        is_profile_completed: true,
      })
    );
    localStorage.setItem(HEADLESS_SESSION_TOKEN_KEY, 'sess-1');
    localStorage.setItem(HEADLESS_ACCESS_TOKEN_KEY, 'acc-1');

    const localHeadless = jasmine.createSpyObj<HeadlessAuthApiService>('HeadlessAuthApiService', [
      'getConfig',
      'getSession',
      'login',
      'signup',
      'deleteSession',
      'verifyEmail',
    ]);
    const localConfig: ConfigurationResponse = {
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
    localHeadless.getConfig.and.returnValue(of(localConfig));
    localHeadless.getSession.and.returnValue(throwError(() => new Error('session check failed')));

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: { get: () => of({ id: 1 }), put: () => of({}) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: HeadlessAuthApiService, useValue: localHeadless },
      ],
    });

    const localService = TestBed.inject(AuthService);
    expect(localService.isAuthenticated()).toBe(true);
    expect(localService.currentUser()?.email).toBe('persisted@example.com');
  });
});
