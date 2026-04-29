import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { appSessionTokenInterceptor } from './app-session-token.interceptor';
import { credentialsInterceptor } from './credentials.interceptor';

describe('appSessionTokenInterceptor', () => {
  const api = environment.API_BASE_URL;

  beforeEach(() => localStorage.clear());

  it('adds X-Session-Token for /auth/app/v1/ when a session token is stored', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    localStorage.setItem('headless_session_token', 'tok-99');
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
    localStorage.setItem('headless_session_token', 'tok-99');
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
    localStorage.setItem('headless_session_token', 'tok-after-init');
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

  it('does not add X-Session-Token for passkey login GET/POST (anonymous identifier flow)', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    localStorage.setItem('headless_session_token', 'tok-stale');
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
    http.post(loginUrl, { credential: { type: 'public-key' } }).subscribe();
    let req = httpMock.expectOne(loginUrl);
    expect(req.request.headers.get('X-Session-Token')).toBeNull();
    req.flush({ status: 200, data: {} });
    http.get(loginUrl).subscribe();
    req = httpMock.expectOne(loginUrl);
    expect(req.request.headers.get('X-Session-Token')).toBeNull();
    req.flush({ status: 200, data: {} });
    httpMock.verify();
  });

  it('does not add X-Session-Token for passkey signup initiate POST', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    localStorage.setItem('headless_session_token', 'tok-stale');
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
