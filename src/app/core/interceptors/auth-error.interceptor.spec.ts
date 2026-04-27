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
import { HeadlessAuthApiService } from '../auth/headless/headless-auth-api.service';
import { AuthService } from '../auth/services/auth.service';
import {
  authErrorInterceptor,
  CMS_401_REFRESH_HEADER,
  SESSION_401_RECHECK_HEADER,
} from './auth-error.interceptor';
import { headersInterceptor } from './global.interceptor';
import { credentialsInterceptor } from './credentials.interceptor';
import { csrfResponseInterceptor } from './csrf-response.interceptor';
import { appSessionTokenInterceptor } from './app-session-token.interceptor';

describe('authErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  const api = environment.API_BASE_URL;
  const profileUrl = `${api}/auth/profile/`;
  const appSessionUrl = `${api}/auth/app/v1/auth/session`;

  beforeEach(() => {
    localStorage.clear();
    const authMock = jasmine.createSpyObj<AuthService>('AuthService', [
      'sessionRecheckAfter401',
      'invalidateClientAuthAndGoLogin',
    ]);
    const headlessMock = jasmine.createSpyObj<HeadlessAuthApiService>('HeadlessAuthApiService', [
      'refreshAccessToken',
    ]);
    authMock.sessionRecheckAfter401.and.returnValue(of(true));
    headlessMock.refreshAccessToken.and.returnValue(
      of({ status: 200, data: { access_token: 'new-access', refresh_token: 'new-refresh' } })
    );

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
        { provide: HeadlessAuthApiService, useValue: headlessMock },
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

  it('on 401 to API profile, rechecks session and retries with recheck header', (done) => {
    const authMock = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    const headlessMock = TestBed.inject(
      HeadlessAuthApiService
    ) as jasmine.SpyObj<HeadlessAuthApiService>;

    http.get(profileUrl).subscribe({
      next: (body: unknown) => {
        expect(body).toEqual({ ok: true });
        expect(authMock.sessionRecheckAfter401).toHaveBeenCalled();
        expect(headlessMock.refreshAccessToken).not.toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(profileUrl);
    r1.flush({ message: 'unauth' }, { status: 401, statusText: 'Unauthorized' });

    const r2 = httpMock.expectOne(
      (req) => req.url === profileUrl && req.headers.get(SESSION_401_RECHECK_HEADER) === '1'
    );
    r2.flush({ ok: true });
  });

  it('on 401 to API profile with refresh token, refreshes access token and retries once', (done) => {
    const headlessMock = TestBed.inject(
      HeadlessAuthApiService
    ) as jasmine.SpyObj<HeadlessAuthApiService>;
    localStorage.setItem('headless_refresh_token', 'refresh-1');

    http.get(profileUrl).subscribe({
      next: (body: unknown) => {
        expect(body).toEqual({ ok: true });
        expect(headlessMock.refreshAccessToken).toHaveBeenCalled();
        expect(localStorage.getItem('headless_access_token')).toBe('new-access');
        expect(localStorage.getItem('headless_refresh_token')).toBe('new-refresh');
        done();
      },
    });

    const r1 = httpMock.expectOne(profileUrl);
    r1.flush({ message: 'unauth' }, { status: 401, statusText: 'Unauthorized' });

    const r2 = httpMock.expectOne(
      (req) => req.url === profileUrl && req.headers.get(CMS_401_REFRESH_HEADER) === '1'
    );
    r2.flush({ ok: true });
  });

  it('on 401 with reauthentication body (e.g. mfa_reauthenticate), navigates to /reauthenticate', (done) => {
    const router = TestBed.inject(Router) as unknown as { navigate: jasmine.Spy; url: string };

    http.get(profileUrl).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
        expect(router.navigate).toHaveBeenCalledWith(
          ['/reauthenticate'],
          jasmine.objectContaining({
            queryParams: { returnUrl: '/gallery' },
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

  it('on 410 to app headless session, invalidates client auth and does not retry', (done) => {
    const authMock = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    localStorage.setItem('headless_session_token', 'session-x');

    http.get(appSessionUrl).subscribe({
      error: (err) => {
        expect(err.status).toBe(410);
        expect(authMock.invalidateClientAuthAndGoLogin).toHaveBeenCalled();
        done();
      },
    });

    const r1 = httpMock.expectOne(appSessionUrl);
    r1.flush('gone', { status: 410, statusText: 'Gone' });
  });
});
