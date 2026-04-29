import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { HeadlessAppTokenService } from './headless-app-token.service';
import { HeadlessAuthApiService } from './headless-auth-api.service';
import { HEADLESS_CLIENT_APP, HEADLESS_CLIENT_BROWSER } from './headless-api.types';

describe('HeadlessAuthApiService', () => {
  let httpMock: HttpTestingController;
  let service: HeadlessAuthApiService;
  const api = environment.API_BASE_URL;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HeadlessAuthApiService,
        HeadlessAppTokenService,
      ],
    });
    service = TestBed.inject(HeadlessAuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('buildProviderRedirectUrl targets browser client provider redirect', () => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    expect(service.buildProviderRedirectUrl()).toBe(
      `${api}/auth/${HEADLESS_CLIENT_BROWSER}/v1/auth/provider/redirect`
    );
  });

  it('refreshAccessToken POSTs to app tokens/refresh with stored refresh_token', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    localStorage.setItem('headless_refresh_token', 'rt-1');
    service.refreshAccessToken().subscribe((res) => {
      expect(res.data.access_token).toBe('a2');
      done();
    });
    const r = httpMock.expectOne(`${api}/auth/${HEADLESS_CLIENT_APP}/v1/tokens/refresh`);
    expect(r.request.body).toEqual({ refresh_token: 'rt-1' });
    r.flush({ status: 200, data: { access_token: 'a2' } });
  });

  it('postWebauthnLogin sends a single credential envelope when payload is already wrapped', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const envelope = { credential: { type: 'public-key', id: 'assertion-1' } };
    service.postWebauthnLogin(envelope).subscribe(() => done());
    const r = httpMock.expectOne(`${api}/auth/${HEADLESS_CLIENT_APP}/v1/auth/webauthn/login`);
    expect(r.request.body).toEqual(envelope);
    const body = r.request.body as { credential: { credential?: unknown } };
    expect(body.credential.credential).toBeUndefined();
    r.flush({ status: 200, data: { user: {}, methods: [] }, meta: { is_authenticated: true } });
  });

  it('addWebauthnAuthenticator sends a single credential envelope when payload is already wrapped', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const envelope = { credential: { type: 'public-key', id: 'cred-1' } };
    service.addWebauthnAuthenticator(envelope).subscribe(() => done());
    const r = httpMock.expectOne(
      `${api}/auth/${HEADLESS_CLIENT_APP}/v1/account/authenticators/webauthn`
    );
    expect(r.request.body).toEqual(envelope);
    const body = r.request.body as { credential: { credential?: unknown } };
    expect(body.credential.credential).toBeUndefined();
    r.flush({ status: 200, data: {} });
  });

  it('addWebauthnAuthenticator wraps a raw inner credential object', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const inner = { type: 'public-key', id: 'cred-1' };
    service.addWebauthnAuthenticator(inner).subscribe(() => done());
    const r = httpMock.expectOne(
      `${api}/auth/${HEADLESS_CLIENT_APP}/v1/account/authenticators/webauthn`
    );
    expect(r.request.body).toEqual({ credential: inner });
    r.flush({ status: 200, data: {} });
  });
});
