import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  extractCsrfFromHeadlessConfigResponse,
  getDjangoCsrfTokenForRequest,
  getDjangoCsrfTokenFromCookie,
  setCrossOriginDjangoCsrfToken,
} from '../../utils/csrf.util';
import {
  AuthenticatedResponse,
  ConfigurationResponse,
  HEADLESS_CLIENT_BROWSER,
  WebAuthnRequestOptionsResponse,
} from './headless-api.types';

const jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable({ providedIn: 'root' })
export class HeadlessAuthApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.API_BASE_URL}/auth/${HEADLESS_CLIENT_BROWSER}/v1`;
  }

  getConfig(): Observable<ConfigurationResponse> {
    return this.http.get<ConfigurationResponse>(`${this.base()}/config`).pipe(
      tap((res) => {
        const fromJson = extractCsrfFromHeadlessConfigResponse(res);
        if (fromJson) {
          setCrossOriginDjangoCsrfToken(fromJson);
        } else {
          const fromCookie = getDjangoCsrfTokenFromCookie();
          // Do not set null here — would wipe a value from `csrfResponseInterceptor` on cross-origin.
          if (fromCookie) {
            setCrossOriginDjangoCsrfToken(fromCookie);
          }
        }
      })
    );
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
    return this.http.get<WebAuthnRequestOptionsResponse>(`${this.base()}/auth/webauthn/login`, {
      params: new HttpParams().set('passwordless', 'true'),
    });
  }

  postWebauthnLogin(credential: unknown): Observable<AuthenticatedResponse> {
    return this.http.post<AuthenticatedResponse>(
      `${this.base()}/auth/webauthn/login`,
      { credential },
      { headers: jsonHeaders }
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
   * Token refresh (app path per contract) — use when refresh_token is available.
   */
  refreshAppTokens(body: { refresh_token: string }): Observable<{
    status: 200;
    data: { access_token: string; refresh_token?: string };
  }> {
    const url = `${environment.API_BASE_URL}/auth/app/v1/tokens/refresh`;
    return this.http.post<{
      status: 200;
      data: { access_token: string; refresh_token?: string };
    }>(url, body, { headers: jsonHeaders });
  }

  /**
   * Synchronous (non-XHR) provider redirect per contract — not used here; use `submitProviderRedirectForm`.
   */
  buildProviderRedirectUrl(): string {
    return `${this.base()}/auth/provider/redirect`;
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
