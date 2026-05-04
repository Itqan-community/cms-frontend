import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, MonoTypeOperatorFunction, of, tap, throwError } from 'rxjs';
import { recoverHeadlessJsonOkOnHttpError } from './headless-http-recover.util';
import { environment } from '../../../../environments/environment';
import {
  AuthenticatedResponse,
  AuthenticationResponse,
  AuthenticatorsListResponse,
  ConfigurationResponse,
  HEADLESS_CLIENT_APP,
  HEADLESS_CLIENT_BROWSER,
  PasskeySignup,
  RecoveryCodesResponse,
  TotpActiveResponse,
  TotpPendingResponseBody,
  TotpStatusResult,
  WebAuthnCreationOptionsResponse,
  WebAuthnRequestOptionsResponse,
} from './headless-api.types';
import { HeadlessAppTokenService } from './headless-app-token.service';
import { webauthnCredentialRequestBody } from './headless-webauthn-http.util';
import { ALLAUTH_APP_USER_AGENT, ALLAUTH_URLS } from './allauth-urls';
import {
  type ProviderRedirectProcess,
  type ProviderRedirectResult,
  startHeadlessProviderRedirect,
} from './headless-provider-redirect.util';
import { AllauthAuthChangeBus } from './allauth-auth-change.bus';
import { applyAllauthEnvelopeSideEffects } from './allauth-envelope.util';
import {
  extractCsrfFromHeadlessConfigResponse,
  setCrossOriginDjangoCsrfToken,
} from '../../utils/csrf.util';

const JSON_CT = 'application/json';

export type AuthenticatedOrChallenge = AuthenticatedResponse | AuthenticationResponse;

@Injectable({ providedIn: 'root' })
export class HeadlessAuthApiService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(HeadlessAppTokenService);
  private readonly authBus = inject(AllauthAuthChangeBus);

  private base(): string {
    return `${environment.API_BASE_URL}/auth/${HEADLESS_CLIENT_APP}/v1`;
  }

  private browserBase(): string {
    return `${environment.API_BASE_URL}/auth/${HEADLESS_CLIENT_BROWSER}/v1`;
  }

  /** Mirrors official SPA JSON responses + auth-change dispatch rules. */
  private envTap<T>(): MonoTypeOperatorFunction<T> {
    return tap((body: T) =>
      applyAllauthEnvelopeSideEffects(body as unknown, this.tokens, this.authBus)
    );
  }

  private headers(extra?: Record<string, string>): HttpHeaders {
    let h = new HttpHeaders({
      Accept: JSON_CT,
      'User-Agent': ALLAUTH_APP_USER_AGENT,
    });
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        h = h.set(k, v);
      }
    }
    return h;
  }

  private jsonHeaders(extra?: Record<string, string>): HttpHeaders {
    return this.headers(extra).set('Content-Type', JSON_CT);
  }

  getConfig(): Observable<ConfigurationResponse> {
    return this.http
      .get<ConfigurationResponse>(`${this.base()}${ALLAUTH_URLS.CONFIG}`, {
        headers: this.headers(),
      })
      .pipe(this.envTap());
  }

  /**
   * Issues (or rotates) Django `csrftoken` for `.itqan.dev`-style setups via `{ withCredentials }`
   * (`/auth/browser/…` paths are cookie-backed). Needed before **`POST …/browser/…/auth/provider/redirect`**:
   * bootstrap only touches `/auth/app/v1/config` (no credentials).
   */
  getBrowserConfig(): Observable<ConfigurationResponse> {
    return this.http
      .get<ConfigurationResponse>(`${this.browserBase()}${ALLAUTH_URLS.CONFIG}`, {
        headers: this.headers(),
      })
      .pipe(
        tap((body) => {
          const csrf = extractCsrfFromHeadlessConfigResponse(body);
          if (csrf) {
            setCrossOriginDjangoCsrfToken(csrf);
          }
        })
      );
  }

  /** Official SPA name — same as {@link getSession}. */
  getAuth(): Observable<AuthenticatedOrChallenge> {
    return this.getSession();
  }

  getSession(): Observable<AuthenticatedOrChallenge> {
    return this.http
      .get<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.SESSION}`, {
        headers: this.headers(),
      })
      .pipe(this.envTap());
  }

  /**
   * Browser headless session (cookie-backed). Uses `withCredentials` via interceptor for non-app
   * auth URLs (not under `/auth/app/v1`). Used after OAuth return when app session GET is still
   * anonymous.
   */
  getBrowserSession(): Observable<AuthenticatedOrChallenge> {
    return this.http
      .get<AuthenticatedResponse>(`${this.browserBase()}${ALLAUTH_URLS.SESSION}`, {
        headers: this.headers(),
      })
      .pipe(this.envTap());
  }

  deleteSession(): Observable<unknown> {
    return this.http
      .delete(`${this.base()}${ALLAUTH_URLS.SESSION}`, {
        headers: this.headers(),
      })
      .pipe(this.envTap());
  }

  login(body: { email: string; password: string }): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.LOGIN}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  signup(body: Record<string, unknown>): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.SIGNUP}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  reauthenticate(body: { password: string }): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.REAUTHENTICATE}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  requestLoginCode(body: { email: string } | { phone: string }): Observable<unknown> {
    return this.http
      .post(`${this.base()}${ALLAUTH_URLS.REQUEST_LOGIN_CODE}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  confirmLoginCode(body: { code: string }): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.CONFIRM_LOGIN_CODE}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  requestPasswordReset(body: { email: string }): Observable<unknown> {
    return this.http
      .post(`${this.base()}${ALLAUTH_URLS.REQUEST_PASSWORD_RESET}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  getPasswordResetInfo(resetKey: string): Observable<unknown> {
    return this.http
      .get(`${this.base()}${ALLAUTH_URLS.RESET_PASSWORD}`, {
        headers: new HttpHeaders({
          Accept: JSON_CT,
          'User-Agent': ALLAUTH_APP_USER_AGENT,
          'X-Password-Reset-Key': resetKey,
        }),
      })
      .pipe(this.envTap());
  }

  resetPassword(body: { key: string; password: string }): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.RESET_PASSWORD}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  changePassword(body: Record<string, unknown>): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.CHANGE_PASSWORD}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  getEmailAddresses(): Observable<unknown> {
    return this.http
      .get(`${this.base()}${ALLAUTH_URLS.EMAIL}`, { headers: this.headers() })
      .pipe(this.envTap());
  }

  addEmail(body: { email: string }): Observable<unknown> {
    return this.http
      .post(`${this.base()}${ALLAUTH_URLS.EMAIL}`, body, { headers: this.jsonHeaders() })
      .pipe(this.envTap());
  }

  deleteEmail(body: { email: string }): Observable<unknown> {
    return this.http
      .request('DELETE', `${this.base()}${ALLAUTH_URLS.EMAIL}`, {
        headers: this.jsonHeaders(),
        body,
      })
      .pipe(this.envTap());
  }

  markEmailAsPrimary(body: { email: string; primary: true }): Observable<unknown> {
    return this.http
      .patch(`${this.base()}${ALLAUTH_URLS.EMAIL}`, body, { headers: this.jsonHeaders() })
      .pipe(this.envTap());
  }

  requestEmailVerification(body: { email: string }): Observable<unknown> {
    return this.http
      .put(`${this.base()}${ALLAUTH_URLS.EMAIL}`, body, { headers: this.jsonHeaders() })
      .pipe(this.envTap());
  }

  getEmailVerifyInfo(verificationKey: string): Observable<unknown> {
    return this.http
      .get(`${this.base()}${ALLAUTH_URLS.VERIFY_EMAIL}`, {
        headers: new HttpHeaders({
          Accept: JSON_CT,
          'User-Agent': ALLAUTH_APP_USER_AGENT,
          'X-Email-Verification-Key': verificationKey,
        }),
      })
      .pipe(this.envTap());
  }

  verifyEmail(body: { key: string }): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.VERIFY_EMAIL}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  resendEmailVerification(): Observable<unknown> {
    return this.http
      .post(`${this.base()}${ALLAUTH_URLS.VERIFY_EMAIL}/resend`, null, {
        headers: this.headers(),
      })
      .pipe(this.envTap());
  }

  mfaAuthenticate(body: { code: string }): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.MFA_AUTHENTICATE}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  mfaReauthenticate(body: { code: string }): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.MFA_REAUTHENTICATE}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  mfaTrust(trust: boolean): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.MFA_TRUST}`, { trust }, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  /**
   * Starts browser OAuth using headless `POST .../auth/browser/v1/auth/provider/redirect`
   * (form-encoded body; {@link startHeadlessProviderRedirect}).
   * On success returns either an external redirect URL or a JSON envelope (errors / challenges).
   */
  redirectToProvider(payload: {
    provider: string;
    process: ProviderRedirectProcess;
    callbackUrl: string;
    /** Omit for anonymous `login`; required for `connect` with APP client session header. */
    sessionToken?: string | null;
  }): Promise<ProviderRedirectResult> {
    return startHeadlessProviderRedirect({
      apiBaseUrl: environment.API_BASE_URL,
      provider: payload.provider,
      process: payload.process,
      callbackUrl: payload.callbackUrl,
      sessionToken: payload.sessionToken,
    });
  }

  authenticateByToken(payload: {
    provider: string;
    token: string;
    process?: 'login' | 'connect';
  }): Observable<AuthenticatedOrChallenge> {
    const body = {
      provider: payload.provider,
      token: payload.token,
      process: payload.process ?? 'login',
    };
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.PROVIDER_TOKEN}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  getSessions(): Observable<unknown> {
    return this.http
      .get(`${this.base()}${ALLAUTH_URLS.SESSIONS}`, { headers: this.headers() })
      .pipe(this.envTap());
  }

  endSessions(ids: string[]): Observable<unknown> {
    return this.http
      .request('DELETE', `${this.base()}${ALLAUTH_URLS.SESSIONS}`, {
        headers: this.jsonHeaders(),
        body: { sessions: ids },
      })
      .pipe(this.envTap());
  }

  getWebauthnLoginOptions(): Observable<WebAuthnRequestOptionsResponse> {
    return this.http
      .get<WebAuthnRequestOptionsResponse>(`${this.base()}${ALLAUTH_URLS.LOGIN_WEBAUTHN}`, {
        headers: this.headers(),
      })
      .pipe(this.envTap());
  }

  postWebauthnLogin(credential: unknown): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(
        `${this.base()}${ALLAUTH_URLS.LOGIN_WEBAUTHN}`,
        webauthnCredentialRequestBody(credential),
        { headers: this.jsonHeaders() }
      )
      .pipe(this.envTap());
  }

  getWebauthnSignupOptions(): Observable<WebAuthnRequestOptionsResponse> {
    return this.http
      .get<WebAuthnRequestOptionsResponse>(`${this.base()}${ALLAUTH_URLS.SIGNUP_WEBAUTHN}`, {
        headers: this.headers(),
      })
      .pipe(this.envTap());
  }

  initiatePasskeySignup(email: string): Observable<HttpResponse<unknown>> {
    const body: PasskeySignup = { email };
    return this.http
      .post<unknown>(`${this.base()}${ALLAUTH_URLS.SIGNUP_WEBAUTHN}`, body, {
        headers: this.jsonHeaders(),
        observe: 'response',
      })
      .pipe(
        tap((resp) =>
          applyAllauthEnvelopeSideEffects(resp.body as unknown, this.tokens, this.authBus)
        )
      );
  }

  completePasskeySignup(credentialPayload: unknown): Observable<AuthenticatedOrChallenge> {
    return this.http
      .put<AuthenticatedResponse>(
        `${this.base()}${ALLAUTH_URLS.SIGNUP_WEBAUTHN}`,
        webauthnCredentialRequestBody(credentialPayload),
        { headers: this.jsonHeaders() }
      )
      .pipe(this.envTap());
  }

  getWebauthnCreateOptions(passwordless: boolean): Observable<WebAuthnCreationOptionsResponse> {
    const suffix = passwordless ? '?passwordless' : '';
    return this.http
      .get<WebAuthnCreationOptionsResponse>(
        `${this.base()}${ALLAUTH_URLS.WEBAUTHN_AUTHENTICATOR}${suffix}`,
        { headers: this.headers() }
      )
      .pipe(this.envTap());
  }

  /** Alias matching older Angular naming — registered authenticator creation options. */
  getWebauthnAuthenticatorCreateOptions(): Observable<WebAuthnCreationOptionsResponse> {
    return this.getWebauthnCreateOptions(false);
  }

  addWebauthnAuthenticator(credential: unknown): Observable<unknown> {
    return recoverHeadlessJsonOkOnHttpError(
      this.http
        .post(
          `${this.base()}${ALLAUTH_URLS.WEBAUTHN_AUTHENTICATOR}`,
          webauthnCredentialRequestBody(credential),
          { headers: this.jsonHeaders() }
        )
        .pipe(this.envTap())
    );
  }

  deleteWebauthnCredential(ids: string[]): Observable<unknown> {
    return this.http
      .request('DELETE', `${this.base()}${ALLAUTH_URLS.WEBAUTHN_AUTHENTICATOR}`, {
        headers: this.jsonHeaders(),
        body: { authenticators: ids },
      })
      .pipe(this.envTap());
  }

  updateWebauthnCredential(id: string, data: Record<string, unknown>): Observable<unknown> {
    return this.http
      .put(`${this.base()}${ALLAUTH_URLS.WEBAUTHN_AUTHENTICATOR}`, { id, ...data }, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  getWebauthnReauthOptions(): Observable<WebAuthnRequestOptionsResponse> {
    return this.http
      .get<WebAuthnRequestOptionsResponse>(
        `${this.base()}${ALLAUTH_URLS.REAUTHENTICATE_WEBAUTHN}`,
        { headers: this.headers() }
      )
      .pipe(this.envTap());
  }

  postWebauthnReauth(credential: unknown): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(
        `${this.base()}${ALLAUTH_URLS.REAUTHENTICATE_WEBAUTHN}`,
        webauthnCredentialRequestBody(credential),
        { headers: this.jsonHeaders() }
      )
      .pipe(this.envTap());
  }

  getWebauthnMfaOptions(): Observable<WebAuthnRequestOptionsResponse> {
    return this.http
      .get<WebAuthnRequestOptionsResponse>(
        `${this.base()}${ALLAUTH_URLS.AUTHENTICATE_WEBAUTHN}`,
        { headers: this.headers() }
      )
      .pipe(this.envTap());
  }

  postWebauthnMfa(credential: unknown): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(
        `${this.base()}${ALLAUTH_URLS.AUTHENTICATE_WEBAUTHN}`,
        webauthnCredentialRequestBody(credential),
        { headers: this.jsonHeaders() }
      )
      .pipe(this.envTap());
  }

  listAuthenticators(): Observable<AuthenticatorsListResponse> {
    return this.http
      .get<AuthenticatorsListResponse>(
        `${this.base()}${ALLAUTH_URLS.AUTHENTICATORS}`,
        { headers: this.headers() }
      )
      .pipe(this.envTap());
  }

  getTotpStatus(): Observable<TotpStatusResult> {
    const url = `${this.base()}${ALLAUTH_URLS.TOTP_AUTHENTICATOR}`;
    return this.http.get<TotpActiveResponse>(url, { headers: this.headers() }).pipe(
      this.envTap(),
      map((res) => ({
        kind: 'active' as const,
        data: res.data,
        meta: res.meta,
      })),
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse) || err.status !== 404) {
          return throwError(() => err);
        }
        const body = err.error as Partial<TotpPendingResponseBody> | null;
        if (
          body &&
          body.meta &&
          typeof body.meta.secret === 'string' &&
          typeof body.meta.totp_url === 'string'
        ) {
          return of({
            kind: 'pending_setup' as const,
            meta: { secret: body.meta.secret, totp_url: body.meta.totp_url },
          });
        }
        return throwError(() => err);
      })
    );
  }

  activateTotp(body: { code: string }): Observable<TotpActiveResponse> {
    return this.http
      .post<TotpActiveResponse>(
        `${this.base()}${ALLAUTH_URLS.TOTP_AUTHENTICATOR}`,
        body,
        { headers: this.jsonHeaders() }
      )
      .pipe(this.envTap());
  }

  deactivateTotp(): Observable<unknown> {
    return recoverHeadlessJsonOkOnHttpError(
      this.http
        .delete(`${this.base()}${ALLAUTH_URLS.TOTP_AUTHENTICATOR}`, {
          headers: this.jsonHeaders(),
        })
        .pipe(this.envTap())
    );
  }

  getRecoveryCodes(): Observable<RecoveryCodesResponse> {
    return this.http
      .get<RecoveryCodesResponse>(
        `${this.base()}${ALLAUTH_URLS.RECOVERY_CODES}`,
        { headers: this.headers() }
      )
      .pipe(this.envTap());
  }

  regenerateRecoveryCodes(): Observable<RecoveryCodesResponse> {
    return recoverHeadlessJsonOkOnHttpError(
      this.http
        .post<RecoveryCodesResponse>(
          `${this.base()}${ALLAUTH_URLS.RECOVERY_CODES}`,
          {},
          { headers: this.jsonHeaders() }
        )
        .pipe(this.envTap())
    );
  }

  getProviderSignupInfo(): Observable<unknown> {
    return this.http
      .get(`${this.base()}${ALLAUTH_URLS.PROVIDER_SIGNUP}`, { headers: this.headers() })
      .pipe(this.envTap());
  }

  postProviderSignup(body: { email: string }): Observable<AuthenticatedOrChallenge> {
    return this.http
      .post<AuthenticatedResponse>(`${this.base()}${ALLAUTH_URLS.PROVIDER_SIGNUP}`, body, {
        headers: this.jsonHeaders(),
      })
      .pipe(this.envTap());
  }

  getProviderAccounts(): Observable<unknown> {
    return this.http
      .get(`${this.base()}${ALLAUTH_URLS.PROVIDERS}`, { headers: this.headers() })
      .pipe(this.envTap());
  }

  disconnectProviderAccount(providerId: string, accountUid: string): Observable<unknown> {
    return this.http
      .request('DELETE', `${this.base()}${ALLAUTH_URLS.PROVIDERS}`, {
        headers: this.jsonHeaders(),
        body: { provider: providerId, account: accountUid },
      })
      .pipe(this.envTap());
  }
}
