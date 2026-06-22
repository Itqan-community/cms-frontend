import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
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

const profileApiPayload = {
  id: '1',
  name: 'Test',
  email: 't@example.com',
  phone: '',
  is_active: true,
  is_profile_completed: false,
  bio: '',
  project_summary: '',
  project_url: '',
  job_title: '',
  created_at: '',
  updated_at: '',
  permissions: [{ code_name: 'portal_access', name: 'Portal' }],
};

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

  let httpClientMock: {
    get: jasmine.Spy;
    put: jasmine.Spy;
    post: jasmine.Spy;
    patch: jasmine.Spy;
    delete: jasmine.Spy;
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
      'deleteBrowserSession',
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
      } as ConfigurationResponse)
    );
    headless.redirectToProvider.and.returnValue(Promise.resolve({ kind: 'form_submitted' }));
    headless.deleteSession.and.returnValue(of(null));
    headless.deleteBrowserSession.and.returnValue(of(null));
    routerMock = {
      url: '/account/login?next=%2Faccount%2Fproviders',
      navigate: jasmine.createSpy('navigate'),
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
      parseUrl: jasmine
        .createSpy('parseUrl')
        .and.returnValue({ queryParams: { next: '/account/providers' } }),
    };

    httpClientMock = {
      get: jasmine.createSpy('httpGet').and.returnValue(of(profileApiPayload)),
      put: jasmine.createSpy('httpPut').and.returnValue(of({})),
      post: jasmine.createSpy('httpPost').and.returnValue(of({})),
      patch: jasmine.createSpy('httpPatch').and.returnValue(of({})),
      delete: jasmine.createSpy('httpDelete').and.returnValue(of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: httpClientMock },
        { provide: Router, useValue: routerMock },
        { provide: HeadlessAuthApiService, useValue: headless },
      ],
    });
    service = TestBed.inject(AuthService);
    tokenStore = TestBed.inject(HeadlessAppTokenService);
  });

  it('bootstrapOnce merges normalized permissions from profile when authenticated', async () => {
    await service.bootstrapOnce();
    expect(httpClientMock.get).toHaveBeenCalled();
    expect(service.getCurrentUser()?.permissions).toEqual(['portal_access']);
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

  it('startGoogleOAuth with login clears stale auth state and browser session before redirect', async () => {
    tokenStore.setSessionToken('stale-token');
    localStorage.setItem('headless_access_token', 'stale-access');
    headless.redirectToProvider.and.returnValue(
      Promise.resolve({ kind: 'error', message: 'backend refused' })
    );
    await service.startGoogleOAuth('http://localhost/cb', 'login');
    expect(tokenStore.getSessionToken()).toBeNull();
    expect(headless.deleteBrowserSession).toHaveBeenCalled();
    expect(headless.redirectToProvider).toHaveBeenCalled();
  });

  it('LOGGED_IN auth event navigates to query next URL when not on OAuth callback', async () => {
    const fn = (
      service as unknown as { handleAuthChangeEvent: (...args: unknown[]) => Promise<void> }
    ).handleAuthChangeEvent;
    await fn.call(service, 'LOGGED_IN', {});
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/account/providers');
  });

  it('LOGGED_IN defers navigation when on provider OAuth callback route', async () => {
    routerMock.url = '/account/provider/callback?next=%2Fgallery';
    routerMock.parseUrl.and.returnValue({ queryParams: { next: '/gallery' } });
    routerMock.navigateByUrl.calls.reset();
    const fn = (
      service as unknown as { handleAuthChangeEvent: (...args: unknown[]) => Promise<void> }
    ).handleAuthChangeEvent;
    await fn.call(service, 'LOGGED_IN', {});
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('bootstrapSessionAfterOAuthRedirect works when session is backed only by readable sessionid cookie', (done) => {
    spyOnProperty(document, 'cookie', 'get').and.returnValue('sessionid=oauth-cookie-seed; Path=/');
    headless.getBrowserSession.and.returnValue(of(authedResponse()));
    headless.getSession.calls.reset();

    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe(() => {
      expect(tokenStore.getSessionToken()).toBe('oauth-cookie-seed');
      expect(headless.getSession).not.toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('bootstrapSessionAfterOAuthRedirect skips app session when browser session is established', (done) => {
    headless.getBrowserSession.and.returnValue(of(authedResponse()));
    headless.getSession.calls.reset();
    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe(() => {
      expect(headless.getSession).not.toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('bootstrapSessionAfterOAuthRedirect unwraps HTTP 401 on browser session then uses app session', (done) => {
    headless.getBrowserSession.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: {
              status: 401,
              data: { methods: [] },
              meta: { is_authenticated: false },
            },
          })
      )
    );
    headless.getSession.calls.reset();
    headless.getSession.and.returnValue(of(authedResponse()));
    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe(() => {
      expect(headless.getSession).toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('bootstrapSessionAfterOAuthRedirect unwraps bare HTTP 401 on browser session (no JSON body)', (done) => {
    headless.getBrowserSession.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }))
    );
    headless.getSession.calls.reset();
    headless.getSession.and.returnValue(of(authedResponse()));
    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe(() => {
      expect(headless.getSession).toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('bootstrapSessionAfterOAuthRedirect uses app session when browser anonymous', (done) => {
    const anonymous = {
      status: 200,
      data: { methods: [] },
      meta: { is_authenticated: false },
    } as unknown as AuthenticatedResponse;
    headless.getBrowserSession.and.returnValue(of(anonymous));
    headless.getSession.and.returnValue(of(authedResponse()));
    service.bootstrapSessionAfterOAuthRedirect({ fetchProfile: false }).subscribe(() => {
      expect(headless.getSession).toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('listApiKeys GET /api-keys/ and parses rows', async () => {
    httpClientMock.get.and.returnValue(of([{ id: '1', name: 'A', masked_key: 'mk' }]));
    const rows = await firstValueFrom(service.listApiKeys());
    expect(rows.length).toBe(1);
    expect(rows[0]?.maskedKey).toBe('mk');
    const url = httpClientMock.get.calls.mostRecent().args[0] as string;
    expect(url.endsWith('/api-keys/')).toBe(true);
  });

  it('createApiKey POST body and parses create payload', async () => {
    httpClientMock.post.and.returnValue(
      of({ id: '2', name: 'B', masked_key: 'x', raw_key: 'secret' })
    );
    const r = await firstValueFrom(service.createApiKey({ name: 'B' }));
    expect(httpClientMock.post.calls.mostRecent().args[1]).toEqual({ name: 'B' });
    expect(r.rawKey).toBe('secret');
    expect(r.key.id).toBe('2');
  });

  it('updateApiKey PATCH returns normalized row', async () => {
    httpClientMock.patch.and.returnValue(
      of({ id: '9', name: 'Renamed', masked_key: 'z', revoked: false })
    );
    const row = await firstValueFrom(service.updateApiKey('9', { name: 'Renamed' }));
    expect(row.name).toBe('Renamed');
    const patchUrl = httpClientMock.patch.calls.mostRecent().args[0] as string;
    expect(patchUrl).toContain('/api-keys/');
    expect(patchUrl).toContain('9');
  });

  it('deleteApiKey encodes id in URL segment', async () => {
    await firstValueFrom(service.deleteApiKey('abc/def'));
    const delUrl = httpClientMock.delete.calls.mostRecent().args[0] as string;
    expect(delUrl).toContain('abc%2Fdef');
  });
});
