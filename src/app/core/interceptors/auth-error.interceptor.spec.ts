import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ALLAUTH_REAUTHENTICATE_URL } from '../auth/headless/allauth-auth.hooks';
import { HeadlessAppTokenService } from '../auth/headless/headless-app-token.service';
import { AuthService } from '../auth/services/auth.service';
import { authErrorInterceptor } from './auth-error.interceptor';
import { appSessionTokenInterceptor } from './app-session-token.interceptor';
import { credentialsInterceptor } from './credentials.interceptor';
import { csrfResponseInterceptor } from './csrf-response.interceptor';
import { headersInterceptor } from './global.interceptor';

describe('authErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  const api = environment.API_BASE_URL;
  const profileUrl = `${api}/auth/profile/`;
  const assetsUrl = `${api}/assets/`;
  const appSessionUrl = `${api}/auth/app/v1/auth/session`;
  const accountWebauthnUrl = `${api}/auth/app/v1/account/authenticators/webauthn`;

  let authMock: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    authMock = jasmine.createSpyObj<AuthService>('AuthService', [
      'sessionRecheckAfter401',
      'invalidateClientAuthAndGoLogin',
      'clearStaleClientSession',
      'canActivateAsLoggedIn',
    ]);
    authMock.sessionRecheckAfter401.and.returnValue(of(true));
    authMock.canActivateAsLoggedIn.and.returnValue(false);
    authMock.clearStaleClientSession.and.callFake(() => {
      TestBed.inject(HeadlessAppTokenService).blockSessionCookieFallback();
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([
            credentialsInterceptor,
            csrfResponseInterceptor,
            appSessionTokenInterceptor,
            headersInterceptor,
            authErrorInterceptor,
          ])
        ),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authMock },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate'),
            url: '/gallery',
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('on 401 to API profile with session token while logged in, rechecks session and retries', (done) => {
    authMock.canActivateAsLoggedIn.and.returnValue(true);
    localStorage.setItem('sessionToken', 'session-x');

    http.get(profileUrl).subscribe({
      next: (body: unknown) => {
        expect(body).toEqual({ ok: true });
        expect(authMock.sessionRecheckAfter401).toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(profileUrl);
    r1.flush({ message: 'unauth' }, { status: 401, statusText: 'Unauthorized' });

    const r2 = httpMock.expectOne(profileUrl);
    r2.flush({ ok: true });
  });

  it('on 401 to API profile without session token, does not recheck session', (done) => {
    const authMock = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    http.get(profileUrl).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
        expect(authMock.sessionRecheckAfter401).not.toHaveBeenCalled();
        expect(authMock.invalidateClientAuthAndGoLogin).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(profileUrl);
    r1.flush({ message: 'unauth' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('on 401 to public assets without session token, does not recheck session', (done) => {
    const authMock = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    http.get(assetsUrl).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
        expect(authMock.sessionRecheckAfter401).not.toHaveBeenCalled();
        expect(authMock.invalidateClientAuthAndGoLogin).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(assetsUrl);
    r1.flush({ message: 'unauth' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('on 401 to public assets with stale token while logged out, clears session and retries without recheck', (done) => {
    localStorage.setItem('sessionToken', 'stale-token');

    http.get(assetsUrl).subscribe({
      next: (body: unknown) => {
        expect(body).toEqual({ results: [] });
        expect(authMock.sessionRecheckAfter401).not.toHaveBeenCalled();
        expect(authMock.clearStaleClientSession).toHaveBeenCalled();
        expect(authMock.invalidateClientAuthAndGoLogin).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(assetsUrl);
    expect(r1.request.headers.get('X-Session-Token')).toBe('stale-token');
    r1.flush({ message: 'unauth' }, { status: 401, statusText: 'Unauthorized' });

    const r2 = httpMock.expectOne(assetsUrl);
    expect(r2.request.headers.has('X-Session-Token')).toBe(false);
    r2.flush({ results: [] });
  });

  it('on 401 to API profile with stale token while logged out, clears session without login redirect', (done) => {
    localStorage.setItem('sessionToken', 'stale-token');

    http.get(profileUrl).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
        expect(authMock.sessionRecheckAfter401).not.toHaveBeenCalled();
        expect(authMock.clearStaleClientSession).toHaveBeenCalled();
        expect(authMock.invalidateClientAuthAndGoLogin).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(profileUrl);
    r1.flush({ message: 'unauth' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('on 401 to API profile with token and failed recheck while logged in, forces login', (done) => {
    authMock.canActivateAsLoggedIn.and.returnValue(true);
    localStorage.setItem('sessionToken', 'session-x');
    authMock.sessionRecheckAfter401.and.returnValue(of(false));

    http.get(profileUrl).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
        expect(authMock.sessionRecheckAfter401).toHaveBeenCalled();
        expect(authMock.invalidateClientAuthAndGoLogin).toHaveBeenCalledWith({
          sessionExpired: true,
        });
        expect(authMock.clearStaleClientSession).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(profileUrl);
    r1.flush({ message: 'unauth' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('on 401 reauthentication body for account webauthn URL, does not navigate away', (done) => {
    const router = TestBed.inject(Router) as unknown as { navigate: jasmine.Spy; url: string };

    http.get(accountWebauthnUrl).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
        expect(router.navigate).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(accountWebauthnUrl);
    r1.flush(
      {
        status: 401,
        meta: { is_authenticated: true },
        data: { flows: [{ id: 'reauthenticate' }] },
      },
      { status: 401, statusText: 'Unauthorized' }
    );
  });

  it('on 401 with reauthentication body on CMS profile, navigates to account reauthenticate', (done) => {
    const router = TestBed.inject(Router) as unknown as { navigate: jasmine.Spy; url: string };

    http.get(profileUrl).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
        expect(router.navigate).toHaveBeenCalledWith(
          [ALLAUTH_REAUTHENTICATE_URL],
          jasmine.objectContaining({
            queryParams: { next: '/gallery' },
          })
        );
        done();
      },
    });

    const r1 = httpMock.expectOne(profileUrl);
    r1.flush(
      {
        status: 401,
        meta: { is_authenticated: true },
        data: { flows: [{ id: 'mfa_reauthenticate' }] },
      },
      { status: 401, statusText: 'Unauthorized' }
    );
  });

  it('on anonymous 401 to app headless session GET, does not navigate to login flows', (done) => {
    const router = TestBed.inject(Router) as unknown as {
      navigate: jasmine.Spy;
      navigateByUrl: jasmine.Spy;
      url: string;
    };
    router.navigateByUrl = jasmine.createSpy('navigateByUrl');

    http.get(appSessionUrl).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
        expect(router.navigate).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(appSessionUrl);
    r1.flush(
      {
        status: 401,
        meta: { is_authenticated: false },
        data: { flows: [{ id: 'login' }] },
      },
      { status: 401, statusText: 'Unauthorized' }
    );
  });

  it('on 410 to app headless session with stored token, clears stale session without login redirect', (done) => {
    const authMock = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    localStorage.setItem('sessionToken', 'session-x');

    http.get(appSessionUrl).subscribe({
      error: (err) => {
        expect(err.status).toBe(410);
        expect(authMock.clearStaleClientSession).toHaveBeenCalled();
        expect(authMock.invalidateClientAuthAndGoLogin).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(appSessionUrl);
    r1.flush('gone', { status: 410, statusText: 'Gone' });
  });

  it('on 410 to app headless session GET without stored token, does not force login redirect', (done) => {
    const authMock = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    http.get(appSessionUrl).subscribe({
      error: (err) => {
        expect(err.status).toBe(410);
        expect(authMock.invalidateClientAuthAndGoLogin).not.toHaveBeenCalled();
        expect(authMock.clearStaleClientSession).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(appSessionUrl);
    r1.flush('gone', { status: 410, statusText: 'Gone' });
  });
});
