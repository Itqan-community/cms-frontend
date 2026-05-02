import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ALLAUTH_SESSION_TOKEN_STORAGE_KEY } from '../auth/headless/headless-app-token.service';
import { appSessionTokenInterceptor } from './app-session-token.interceptor';
import { credentialsInterceptor } from './credentials.interceptor';
import { headersInterceptor } from './global.interceptor';

describe('headersInterceptor', () => {
  const api = environment.API_BASE_URL;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  function setupChain() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([credentialsInterceptor, appSessionTokenInterceptor, headersInterceptor])
        ),
        provideHttpClientTesting(),
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('attaches Bearer for non-app CMS URLs when access_token is stored (no X-Session-Token)', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'sess-parallel');
    localStorage.setItem('headless_access_token', 'jwt-cms');
    const { http, httpMock } = setupChain();
    const profileUrl = `${api}/auth/profile/`;
    http.get(profileUrl).subscribe();
    const req = httpMock.expectOne(profileUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-cms');
    expect(req.request.headers.get('X-Session-Token')).toBeNull();
    req.flush({});
    httpMock.verify();
  });

  it('app client URLs get X-Session-Token from app interceptor, not Bearer from headersInterceptor', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'sess-app');
    localStorage.setItem('headless_access_token', 'jwt-not-for-app-route');
    const { http, httpMock } = setupChain();
    const sessionUrl = `${api}/auth/app/v1/auth/session`;
    http.get(sessionUrl).subscribe();
    const req = httpMock.expectOne(sessionUrl);
    expect(req.request.headers.get('Authorization')).toBeNull();
    expect(req.request.headers.get('X-Session-Token')).toBe('sess-app');
    req.flush({});
    httpMock.verify();
  });
});
