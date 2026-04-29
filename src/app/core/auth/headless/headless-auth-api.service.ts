import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { recoverHeadlessJsonOkOnHttpError } from './headless-http-recover.util';
import { environment } from '../../../../environments/environment';
import { getDjangoCsrfTokenForRequest } from '../../utils/csrf.util';
import {
  AppTokenRefreshResponse,
  AuthenticatedResponse,
  ConfigurationResponse,
  HEADLESS_CLIENT_APP,
  HEADLESS_CLIENT_BROWSER,
  PasskeySignup,
  WebAuthnCreationOptionsResponse,
  WebAuthnRequestOptionsResponse,
} from './headless-api.types';
import { HeadlessAppTokenService } from './headless-app-token.service';

const jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable({ providedIn: 'root' })
export class HeadlessAuthApiService {
  private readonly http = inject(HttpClient);
  private readonly tokenStore = inject(HeadlessAppTokenService);

  private base(): string {
    return `${environment.API_BASE_URL}/auth/${HEADLESS_CLIENT_APP}/v1`;
  }

  /**
   * Contract: `POST /auth/app/v1/tokens/refresh` (no `{client}` in path).
   */
  refreshAccessToken(): Observable<AppTokenRefreshResponse> {
    const refresh = this.tokenStore.getRefreshToken();
    if (!refresh) {
      return throwError(
        () => new Error('HeadlessAuthApiService.refreshAccessToken: no refresh_token in storage')
      );
    }
    return this.http.post<AppTokenRefreshResponse>(
      `${environment.API_BASE_URL}/auth/${HEADLESS_CLIENT_APP}/v1/tokens/refresh`,
      { refresh_token: refresh },
      { headers: jsonHeaders }
    );
  }

  getConfig(): Observable<ConfigurationResponse> {
    // App headless: session continuity uses `X-Session-Token`, not cross-origin CSRF / cookies.
    return this.http.get<ConfigurationResponse>(`${this.base()}/config`);
  }

  login(body: { email: string; password: string }): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(`${this.base()}/auth/login`, body, {
      headers: jsonHeaders,
    });
  }

  signup(body: Record<string, unknown>): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(`${this.base()}/auth/signup`, body, {
      headers: jsonHeaders,
    });
  }

  getSession(): Observable<AuthenticatedResponse> {
    return this.http.get<AuthenticatedResponse>(`${this.base()}/auth/session`);
  }

  /** Logout current session. */
  deleteSession(): Observable<unknown> {
    return this.http.delete(`${this.base()}/auth/session`, { withCredentials: true });
  }

  reauthenticate(body: { password: string }): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(`${this.base()}/auth/reauthenticate`, body, {
      headers: jsonHeaders,
    });
  }

  requestLoginCode(body: { email: string } | { phone: string }): Observable<unknown> {
    return this.http.post(`${this.base()}/auth/code/request`, body, { headers: jsonHeaders });
  }

  confirmLoginCode(body: { code: string }): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(`${this.base()}/auth/code/confirm`, body, {
      headers: jsonHeaders,
    });
  }

  requestPasswordReset(body: { email: string }): Observable<unknown> {
    return this.http.post(`${this.base()}/auth/password/request`, body, { headers: jsonHeaders });
  }

  getPasswordResetInfo(resetKey: string): Observable<unknown> {
    return this.http.get(`${this.base()}/auth/password/reset`, {
      headers: new HttpHeaders({ 'X-Password-Reset-Key': resetKey }),
    });
  }

  resetPassword(body: { key: string; password: string }): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(`${this.base()}/auth/password/reset`, body, {
      headers: jsonHeaders,
    });
  }

  getEmailVerifyInfo(verificationKey: string): Observable<unknown> {
    return this.http.get(`${this.base()}/auth/email/verify`, {
      headers: new HttpHeaders({ 'X-Email-Verification-Key': verificationKey }),
    });
  }

  verifyEmail(body: { key: string }): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(`${this.base()}/auth/email/verify`, body, {
      headers: jsonHeaders,
    });
  }

  resendEmailVerification(): Observable<unknown> {
    return this.http.post(`${this.base()}/auth/email/verify/resend`, null, {
      headers: jsonHeaders,
    });
  }

  mfaAuthenticate(body: { code: string }): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(`${this.base()}/auth/2fa/authenticate`, body, {
      headers: jsonHeaders,
    });
  }

  mfaReauthenticate(body: { code: string }): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(`${this.base()}/auth/2fa/reauthenticate`, body, {
      headers: jsonHeaders,
    });
  }

  getWebauthnLoginOptions(): Observable<WebAuthnRequestOptionsResponse> {
    return this.http.get<WebAuthnRequestOptionsResponse>(`${this.base()}/auth/webauthn/login`);
  }

  postWebauthnLogin(credential: unknown): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(
      `${this.base()}/auth/webauthn/login`,
      { credential },
      { headers: jsonHeaders }
    );
  }

  /** GET request options for passkey signup (`credentials.get` assertion flow). */
  getWebauthnSignupOptions(): Observable<WebAuthnRequestOptionsResponse> {
    return this.http.get<WebAuthnRequestOptionsResponse>(`${this.base()}/auth/webauthn/signup`);
  }

  /** POST initiate passkey signup with email only. */
  initiatePasskeySignup(email: string): Observable<HttpResponse<unknown>> {
    const body: PasskeySignup = { email };
    return this.http.post<unknown>(`${this.base()}/auth/webauthn/signup`, body, {
      headers: jsonHeaders,
      observe: 'response',
    });
  }

  /** PUT complete passkey signup with WebAuthn assertion credential. */
  completePasskeySignup(credentialPayload: unknown): Observable<AuthenticatedResponse> {
    return this.http.put<AuthenticatedResponse>(
      `${this.base()}/auth/webauthn/signup`,
      credentialPayload,
      { headers: jsonHeaders }
    );
  }

  getWebauthnAuthenticatorCreateOptions(): Observable<WebAuthnCreationOptionsResponse> {
    return this.http.get<WebAuthnCreationOptionsResponse>(
      `${this.base()}/account/authenticators/webauthn`
    );
  }

  addWebauthnAuthenticator(credential: unknown): Observable<unknown> {
    return recoverHeadlessJsonOkOnHttpError(
      this.http.post(
        `${this.base()}/account/authenticators/webauthn`,
        { credential },
        { headers: jsonHeaders }
      )
    );
  }

  getWebauthnReauthOptions(): Observable<WebAuthnRequestOptionsResponse> {
    return this.http.get<WebAuthnRequestOptionsResponse>(
      `${this.base()}/auth/webauthn/reauthenticate`
    );
  }

  postWebauthnReauth(credential: unknown): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(
      `${this.base()}/auth/webauthn/reauthenticate`,
      { credential },
      { headers: jsonHeaders }
    );
  }

  getProviderSignupInfo(): Observable<unknown> {
    return this.http.get(`${this.base()}/auth/provider/signup`);
  }

  postProviderSignup(body: { email: string }): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(`${this.base()}/auth/provider/signup`, body, {
      headers: jsonHeaders,
    });
  }

  /**
   * Synchronous (non-XHR) provider redirect per OpenAPI — **browser** client only (302 to IdP).
   * App client uses `provider_token` for non-browser flows.
   */
  buildProviderRedirectUrl(): string {
    return `${environment.API_BASE_URL}/auth/${HEADLESS_CLIENT_BROWSER}/v1/auth/provider/redirect`;
  }
}

/**
 * Submits provider redirect via HTML form (required: synchronous, non-XHR for 302).
 */
export function submitProviderRedirectForm(
  actionUrl: string,
  fields: { provider: string; process: 'login' | 'connect'; callback_url: string }
): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';

  for (const [k, v] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  const csrf = getDjangoCsrfTokenForRequest();
  if (csrf) {
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfmiddlewaretoken';
    csrfInput.value = csrf;
    form.appendChild(csrfInput);
  }
  document.body.appendChild(form);
  form.submit();
}
