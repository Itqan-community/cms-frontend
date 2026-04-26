import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
import { authErrorInterceptor, SESSION_401_RECHECK_HEADER } from './auth-error.interceptor';
import { headersInterceptor } from './global.interceptor';
import { credentialsInterceptor } from './credentials.interceptor';

describe('authErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  const api = environment.API_BASE_URL;
  const profileUrl = `${api}/auth/profile/`;

  beforeEach(() => {
    const authMock = jasmine.createSpyObj<AuthService>('AuthService', [
      'sessionRecheckAfter401',
      'invalidateClientAuthAndGoLogin',
    ]);
    authMock.sessionRecheckAfter401.and.returnValue(of(true));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([credentialsInterceptor, headersInterceptor, authErrorInterceptor])
        ),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
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

    http.get(profileUrl).subscribe({
      next: (body: unknown) => {
        expect(body).toEqual({ ok: true });
        expect(authMock.sessionRecheckAfter401).toHaveBeenCalled();
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
});
