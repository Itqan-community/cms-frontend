import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ALLAUTH_SESSION_TOKEN_STORAGE_KEY } from '../auth/headless/headless-app-token.service';
import { appSessionTokenInterceptor } from './app-session-token.interceptor';
import { credentialsInterceptor } from './credentials.interceptor';

describe('appSessionTokenInterceptor', () => {
  const api = environment.API_BASE_URL;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('adds X-Session-Token for /auth/app/v1/ when a session token is stored', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'tok-99');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor, appSessionTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    http.get(`${api}/auth/app/v1/auth/session`).subscribe();
    const req = httpMock.expectOne(`${api}/auth/app/v1/auth/session`);
    expect(req.request.headers.get('X-Session-Token')).toBe('tok-99');
    req.flush({});
    httpMock.verify();
  });

  it('does not add X-Session-Token for CMS routes outside app headless', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'tok-99');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor, appSessionTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    http.get(`${api}/auth/profile/`).subscribe();
    const req = httpMock.expectOne(`${api}/auth/profile/`);
    expect(req.request.headers.get('X-Session-Token')).toBeNull();
    req.flush({});
    httpMock.verify();
  });

  it('still adds X-Session-Token for GET passkey signup (options after initiate)', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'tok-after-init');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor, appSessionTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    const signupGetUrl = `${api}/auth/app/v1/auth/webauthn/signup`;
    http.get(signupGetUrl).subscribe();
    const req = httpMock.expectOne(signupGetUrl);
    expect(req.request.headers.get('X-Session-Token')).toBe('tok-after-init');
    req.flush({ status: 200, data: { request_options: { publicKey: {} } } });
    httpMock.verify();
  });

  it('adds X-Session-Token for passkey login GET/POST when token exists (stage after options GET)', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'tok-after-login-options');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor, appSessionTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    const loginUrl = `${api}/auth/app/v1/auth/webauthn/login`;
    http.get(loginUrl).subscribe();
    let req = httpMock.expectOne(loginUrl);
    expect(req.request.headers.get('X-Session-Token')).toBe('tok-after-login-options');
    req.flush({
      status: 200,
      data: { request_options: { publicKey: {} } },
      meta: { session_token: 'tok-2' },
    });
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'tok-2');
    http.post(loginUrl, { credential: { type: 'public-key' } }).subscribe();
    req = httpMock.expectOne(loginUrl);
    expect(req.request.headers.get('X-Session-Token')).toBe('tok-2');
    req.flush({ status: 200, data: {} });
    httpMock.verify();
  });

  it('does not add X-Session-Token for passkey login when no token is stored', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor, appSessionTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    const loginUrl = `${api}/auth/app/v1/auth/webauthn/login`;
    http.get(loginUrl).subscribe();
    const req = httpMock.expectOne(loginUrl);
    expect(req.request.headers.get('X-Session-Token')).toBeNull();
    req.flush({ status: 200, data: {} });
    httpMock.verify();
  });

  it('does not add X-Session-Token for passkey signup initiate POST', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'tok-stale');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor, appSessionTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    const signupUrl = `${api}/auth/app/v1/auth/webauthn/signup`;
    http.post(signupUrl, { email: 'a@b.co' }).subscribe();
    const req = httpMock.expectOne(signupUrl);
    expect(req.request.headers.get('X-Session-Token')).toBeNull();
    req.flush({ status: 200 });
    httpMock.verify();
  });
});
