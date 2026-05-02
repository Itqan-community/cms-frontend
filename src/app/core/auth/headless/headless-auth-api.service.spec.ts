import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { HeadlessAppTokenService } from './headless-app-token.service';
import { HeadlessAuthApiService } from './headless-auth-api.service';
import { HEADLESS_CLIENT_APP } from './headless-api.types';

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

  it('getConfig GETs app client /config', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    service.getConfig().subscribe(() => done());
    const r = httpMock.expectOne(`${api}/auth/${HEADLESS_CLIENT_APP}/v1/config`);
    expect(r.request.method).toBe('GET');
    r.flush({ status: 200, data: { account: {} } });
  });

  it('getSession GETs app client /auth/session', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    service.getSession().subscribe(() => done());
    const r = httpMock.expectOne(`${api}/auth/${HEADLESS_CLIENT_APP}/v1/auth/session`);
    expect(r.request.method).toBe('GET');
    r.flush({
      status: 200,
      data: {
        user: { id: 1, display: 'u', email: 'a@b.co', has_usable_password: true },
        methods: [],
      },
      meta: { is_authenticated: true },
    });
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

  it('completePasskeySignup PUT sends a single credential envelope when payload is already wrapped', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const envelope = { credential: { type: 'public-key', id: 'signup-assertion' } };
    service.completePasskeySignup(envelope).subscribe(() => done());
    const r = httpMock.expectOne(`${api}/auth/${HEADLESS_CLIENT_APP}/v1/auth/webauthn/signup`);
    expect(r.request.method).toBe('PUT');
    expect(r.request.body).toEqual(envelope);
    const body = r.request.body as { credential: { credential?: unknown } };
    expect(body.credential.credential).toBeUndefined();
    r.flush({
      status: 200,
      data: {
        user: { id: 1, display: 'u', email: 'a@b.co', has_usable_password: true },
        methods: [],
      },
      meta: { is_authenticated: true },
    });
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

  it('getWebauthnMfaOptions GETs auth/webauthn/authenticate', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    service.getWebauthnMfaOptions().subscribe((res) => {
      expect(res.data.request_options.publicKey).toBeDefined();
      done();
    });
    const r = httpMock.expectOne(`${api}/auth/${HEADLESS_CLIENT_APP}/v1/auth/webauthn/authenticate`);
    expect(r.request.method).toBe('GET');
    r.flush({
      status: 200,
      data: { request_options: { publicKey: { challenge: new Uint8Array() } } },
    });
  });

  it('listAuthenticators GETs account/authenticators', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    service.listAuthenticators().subscribe((res) => {
      expect(res.data.length).toBe(1);
      done();
    });
    const r = httpMock.expectOne(`${api}/auth/${HEADLESS_CLIENT_APP}/v1/account/authenticators`);
    expect(r.request.method).toBe('GET');
    r.flush({
      status: 200,
      data: [{ type: 'totp', created_at: '2020-01-01', last_used_at: null }],
    });
  });
});
