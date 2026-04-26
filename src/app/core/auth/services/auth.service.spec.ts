import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { HeadlessAuthApiService } from '../headless/headless-auth-api.service';
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

describe('AuthService (browser / session)', () => {
  let service: AuthService;
  let headless: jasmine.SpyObj<HeadlessAuthApiService>;

  beforeEach(() => {
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
});
