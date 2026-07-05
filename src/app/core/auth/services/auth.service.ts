import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  finalize,
  firstValueFrom,
  forkJoin,
  map,
  of,
  switchMap,
  take,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ALLAUTH_LOGIN_REDIRECT_URL,
  ALLAUTH_LOGIN_URL,
  ALLAUTH_LOGOUT_REDIRECT_URL,
  AuthChangeEvent,
  type AuthChangeEventType,
  authInfo,
  determineAuthChangeEvent,
  pathForFlow,
  pathForPendingFlow,
} from '../headless/allauth-auth.hooks';
import {
  ALLAUTH_SOCIAL_PROVIDER_GITHUB,
  ALLAUTH_SOCIAL_PROVIDER_GOOGLE,
} from '../headless/allauth-urls';
import { AllauthAuthChangeBus } from '../headless/allauth-auth-change.bus';
import type {
  AuthenticationMeta,
  AuthenticationResponse,
  ConfigurationResponse,
  Flow,
  HeadlessUser,
} from '../headless/headless-api.types';
import {
  AuthenticatedOrChallenge,
  HeadlessAuthApiService,
} from '../headless/headless-auth-api.service';
import { HeadlessAppTokenService } from '../headless/headless-app-token.service';
import type {
  ApiKeyCreateIn,
  ApiKeyCreateResult,
  ApiKeyPatchIn,
  ManagedApiKey,
} from '../models/api-keys.model';
import {
  LoginRequest,
  normalizeProfilePermissionCodes,
  RegisterRequest,
  UpdateProfileRequest,
  UpdateProfileResponse,
  User,
} from '../models/auth.model';
import { normalizeApiKeyRow, parseApiKeyCreated, parseApiKeysList } from '../utils/api-keys.util';
import { getCookie, getDjangoCsrfTokenForRequest } from '../../utils/csrf.util';

/** Bound on the initial session/config calls so a hung backend can't stall bootstrapDone forever. */
const AUTH_BOOTSTRAP_TIMEOUT_MS = 15000;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly headless = inject(HeadlessAuthApiService);
  private readonly tokenStore = inject(HeadlessAppTokenService);
  private readonly authBus = inject(AllauthAuthChangeBus);

  private readonly API_BASE_URL = environment.API_BASE_URL;
  private readonly USER_KEY = 'user';

  /** Latest JSON envelope from `GET /auth/session` or auth-change bus (official SPA shape). */
  readonly authSnapshot = signal<unknown>(undefined);

  readonly bootstrapDone = signal(false);
  readonly authBootstrapFailed = signal(false);
  readonly configSnapshot = signal<ConfigurationResponse | undefined>(undefined);

  /** Mirrors official `authInfo(auth).isAuthenticated`. */
  readonly isAuthenticated = computed(() => authInfo(this.authSnapshot()).isAuthenticated);

  public currentUser = signal<User | null>(null);
  public isLoading = signal(false);
  public authConfig = signal<{
    loginByCodeEnabled: boolean;
    openSignup: boolean;
    emailVerifyByCode: boolean;
    passwordResetByCodeEnabled: boolean;
  } | null>(null);

  private authStateSubject = new BehaviorSubject<boolean>(false);
  public authState$ = this.authStateSubject.asObservable();

  private redirectPrimed = false;
  private prevAuthForRedirect: unknown = undefined;

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

  constructor() {
    this.authBus.changes$.subscribe((msg) => {
      const prev = this.prevAuthForRedirect;
      this.authSnapshot.set(msg);
      this.syncUserFromSnapshot(msg);
      if (this.redirectPrimed && prev !== undefined) {
        const evt = determineAuthChangeEvent(prev, msg);
        if (evt) {
          void this.handleAuthChangeEvent(evt as AuthChangeEventType, msg);
        }
      }
      this.prevAuthForRedirect = msg;
    });
  }

  /**
   * Parallel `GET /auth/session` + `GET /config` — mirrors official `AuthContextProvider` bootstrap.
   * Called from `APP_INITIALIZER`.
   */
  bootstrapOnce(): Promise<void> {
    return firstValueFrom(
      forkJoin({
        auth: this.headless.getAuth().pipe(
          timeout(AUTH_BOOTSTRAP_TIMEOUT_MS),
          catchError(() => {
            this.authBootstrapFailed.set(true);
            return of(false as const);
          })
        ),
        config: this.headless
          .getConfig()
          .pipe(timeout(AUTH_BOOTSTRAP_TIMEOUT_MS), catchError(() => of(undefined))),
      }).pipe(
        tap(({ auth, config }) => {
          if (auth !== false) {
            this.authSnapshot.set(auth);
            this.syncUserFromSnapshot(auth);
            this.prevAuthForRedirect = auth;
          }
          if (config?.status === 200) {
            this.configSnapshot.set(config);
            const a = config.data?.account;
            this.authConfig.set({
              loginByCodeEnabled: a?.login_by_code_enabled ?? false,
              openSignup: a?.is_open_for_signup ?? true,
              emailVerifyByCode: a?.email_verification_by_code_enabled ?? false,
              passwordResetByCodeEnabled: a?.password_reset_by_code_enabled ?? false,
            });
          } else {
            this.authConfig.set(null);
          }
        }),
        switchMap(({ auth }) => {
          if (auth === false || !authInfo(auth).isAuthenticated) {
            return of(void 0);
          }
          return this.getProfile().pipe(
            tap((p) => {
              const cur = this.currentUser();
              if (!cur) return;
              const merged: User = {
                ...cur,
                ...p,
                id: String(p.id ?? cur.id),
                permissions: normalizeProfilePermissionCodes(p.permissions),
              };
              this.currentUser.set(merged);
              localStorage.setItem(this.USER_KEY, JSON.stringify(merged));
            }),
            catchError(() => of(void 0))
          );
        }),
        tap(() => {
          this.bootstrapDone.set(true);
          this.redirectPrimed = true;
        }),
        map(() => void 0)
      )
    );
  }

  private syncUserFromSnapshot(msg: unknown): void {
    const info = authInfo(msg);
    if (info.isAuthenticated && info.user) {
      const u = this.mapHeadlessToUser(info.user);
      this.currentUser.set(u);
      localStorage.setItem(this.USER_KEY, JSON.stringify(u));
      this.authStateSubject.next(true);
      return;
    }
    if (
      msg &&
      typeof msg === 'object' &&
      'status' in msg &&
      (msg as { status: number }).status === 410
    ) {
      this.clearLocalAuthUi({ preserveSessionStorageToken: false });
      return;
    }
    if (!info.isAuthenticated) {
      localStorage.removeItem(this.USER_KEY);
      this.currentUser.set(null);
      this.authStateSubject.next(false);
    }
  }

  private clearLocalAuthUi(opts?: { preserveSessionStorageToken?: boolean }): void {
    localStorage.removeItem(this.USER_KEY);
    if (!opts?.preserveSessionStorageToken) {
      this.tokenStore.clear();
    }
    this.authStateSubject.next(false);
    this.currentUser.set(null);
  }

  /** CMS API recovery — mirrors session recheck intent from earlier interceptor behaviour. */
  sessionRecheckAfter401(): Observable<boolean> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter((result) => result !== null),
        take(1),
        map((result) => !!result)
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    const refreshToken = this.tokenStore.getRefreshToken();
    if (refreshToken) {
      return this.headless.refreshToken({ refresh_token: refreshToken }).pipe(
        map(() => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(true);
          return true;
        }),
        catchError(() => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(false);
          return of(false);
        })
      );
    }

    return this.headless.getSession().pipe(
      map((res) => {
        const info = authInfo(res);
        if (!info.isAuthenticated || res.status !== 200 || !info.user) {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(false);
          return false;
        }
        this.authSnapshot.set(res);
        this.tokenStore.setFromMeta(res.meta);
        this.syncUserFromSnapshot(res);
        this.isRefreshing = false;
        this.refreshTokenSubject.next(true);
        return true;
      }),
      catchError(() => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(false);
        return of(false);
      })
    );
  }

  invalidateClientAuthAndGoLogin(): void {
    this.clearLocalAuthUi({ preserveSessionStorageToken: false });
    this.authSnapshot.set(undefined);
    this.prevAuthForRedirect = undefined;
    void this.router.navigate([ALLAUTH_LOGIN_URL]);
  }

  applyMetaTokens(meta: AuthenticationMeta | undefined): void {
    this.tokenStore.setFromMeta(meta);
  }

  bootstrapSessionFromServer(options?: {
    fetchProfile?: boolean;
  }): Observable<AuthenticatedOrChallenge> {
    return this.headless
      .getSession()
      .pipe(switchMap((res) => this.applyHeadlessSuccess(res, options)));
  }

  /**
   * After browser OAuth return: **`GET /auth/browser/…/session` first** (cookie + credentials)
   * so split-host setups work: `sessionid` lives on the API host and is not readable via JS
   * `getCookie` from the SPA origin. If the browser session is not established, fall back to
   * app `GET /auth/app/…/session` (e.g. existing `meta.session_token` / same-origin cookie seed).
   *
   * Same-origin deployments may still seed `X-Session-Token` from a readable `sessionid` below.
   *
   * `HttpClient` reports HTTP **401/403** on `GET …/session` as {@link HttpErrorResponse} — the
   * headless envelope can still be JSON in {@link HttpErrorResponse.error}; unwrap so fallback
   * can run.
   */
  bootstrapSessionAfterOAuthRedirect(options?: {
    fetchProfile?: boolean;
  }): Observable<AuthenticatedOrChallenge> {
    const fetchProfile = options?.fetchProfile;

    // Same-origin only: if Django sessionid is readable (not HttpOnly), seed app header store.
    if (!this.tokenStore.getSessionToken()) {
      const sessionId = getCookie('sessionid');
      if (sessionId) {
        this.tokenStore.setSessionToken(sessionId);
      }
    }

    return this.headless.getBrowserSession().pipe(
      catchError((err) => this.observableHeadlessEnvelopeFromSessionHttpFailure(err)),
      switchMap((browserRes) => {
        if (this.isOauthReturnSessionEstablished(browserRes)) {
          return this.applyHeadlessSuccess(browserRes, { fetchProfile });
        }
        return this.headless.getSession().pipe(
          catchError((err) => this.observableHeadlessEnvelopeFromSessionHttpFailure(err)),
          switchMap((appRes) =>
            this.applyHeadlessSuccess(
              this.isOauthReturnSessionEstablished(appRes) ? appRes : browserRes,
              { fetchProfile }
            )
          ),
          catchError(() => this.applyHeadlessSuccess(browserRes, { fetchProfile }))
        );
      })
    );
  }

  /** Map HTTP errors on app or browser session GET into a headless envelope so OAuth bootstrap can continue. */
  private observableHeadlessEnvelopeFromSessionHttpFailure(
    err: unknown
  ): Observable<AuthenticatedOrChallenge> {
    if (!(err instanceof HttpErrorResponse)) {
      return throwError(() => err);
    }
    const body = err.error;
    if (
      body &&
      typeof body === 'object' &&
      typeof (body as { status?: unknown }).status === 'number'
    ) {
      return of(body as AuthenticatedOrChallenge);
    }
    return of({
      status: 401,
      data: { flows: [] },
      meta: { is_authenticated: false },
    } as AuthenticationResponse);
  }

  /** True when OAuth callback should treat the user as logged in with a usable profile payload. */
  private isOauthReturnSessionEstablished(res: AuthenticatedOrChallenge): boolean {
    const info = authInfo(res);
    return !!(info.user && info.isAuthenticated && res.status === 200);
  }

  applyHeadlessSuccess(
    res: AuthenticatedOrChallenge,
    options?: { fetchProfile?: boolean; _depth?: number }
  ): Observable<AuthenticatedOrChallenge> {
    const depth = options?._depth ?? 0;
    if (depth > 5) {
      return of(res);
    }
    this.authSnapshot.set(res);
    this.tokenStore.setFromMeta(res.meta);
    this.syncUserFromSnapshot(res);

    const fetchProfile = options?.fetchProfile !== false;

    const payloadUser =
      res.status === 200 && res.data && 'user' in res.data ? res.data.user : undefined;
    if (res.meta?.is_authenticated && !payloadUser) {
      return this.headless
        .getSession()
        .pipe(
          switchMap((s) =>
            this.applyHeadlessSuccess(s, { ...options, fetchProfile, _depth: depth + 1 })
          )
        );
    }

    if (
      fetchProfile &&
      authInfo(res).isAuthenticated &&
      res.status === 200 &&
      res.data &&
      'user' in res.data &&
      res.data.user
    ) {
      return this.getProfile().pipe(
        tap((p) => {
          const cur = this.currentUser();
          const base = cur ?? this.mapHeadlessToUser(res.data!.user);
          const merged: User = {
            ...base,
            ...p,
            id: String(p.id ?? base.id),
            permissions: normalizeProfilePermissionCodes(p.permissions),
          };
          this.currentUser.set(merged);
          localStorage.setItem(this.USER_KEY, JSON.stringify(merged));
        }),
        map(() => res),
        catchError(() => of(res))
      );
    }

    return of(res);
  }

  private mapHeadlessToUser(h: HeadlessUser): User {
    return {
      id: String(h.id),
      name: h.display,
      email: h.email ?? '',
      phone: '',
      is_active: true,
      is_profile_completed: false,
      permissions: [],
    };
  }

  login(credentials: LoginRequest): Observable<AuthenticatedOrChallenge> {
    this.isLoading.set(true);
    return this.headless.login(credentials).pipe(
      switchMap((response) => this.applyHeadlessSuccess(response, { fetchProfile: true })),
      finalize(() => this.isLoading.set(false)),
      catchError((error) => throwError(() => error))
    );
  }

  register(userData: RegisterRequest): Observable<AuthenticatedOrChallenge> {
    this.isLoading.set(true);
    const body: Record<string, unknown> = { email: userData.email, password: userData.password };
    if (userData.phone) {
      body['phone'] = userData.phone;
    }
    return this.headless.signup(body).pipe(
      switchMap((response) => this.applyHeadlessSuccess(response, { fetchProfile: true })),
      finalize(() => this.isLoading.set(false)),
      catchError((error) => throwError(() => error))
    );
  }

  logout(): Observable<void> {
    return this.headless.deleteSession().pipe(
      tap(() => {
        this.performLogoutAfterServer();
      }),
      catchError(() => {
        this.performLogoutAfterServer();
        return of(void 0);
      }),
      switchMap(() => of(void 0))
    );
  }

  private performLogoutAfterServer(): void {
    this.clearLocalAuthUi({ preserveSessionStorageToken: false });
    this.authSnapshot.set(undefined);
    this.prevAuthForRedirect = undefined;
    void this.router.navigate([ALLAUTH_LOGIN_URL]);
  }

  getProfile(): Observable<UpdateProfileResponse> {
    return this.http.get<UpdateProfileResponse>(`${this.API_BASE_URL}/auth/profile/`);
  }

  /** Merges full CMS profile payload (including `permissions`) into {@link currentUser}. */
  applyProfileFromApi(profile: UpdateProfileResponse): void {
    const cur = this.currentUser();
    const base: User =
      cur ??
      ({
        id: String(profile.id),
        name: profile.name,
        email: profile.email,
        phone: profile.phone ?? '',
        is_active: profile.is_active,
        is_profile_completed: profile.is_profile_completed,
        permissions: [],
      } as User);
    const merged: User = {
      ...base,
      ...profile,
      id: String(profile.id ?? base.id),
      permissions: normalizeProfilePermissionCodes(profile.permissions),
    };
    this.currentUser.set(merged);
    localStorage.setItem(this.USER_KEY, JSON.stringify(merged));
  }

  /** Full CMS profile payload for account hub (includes bio, URLs, etc.). */
  getProfileDetails(): Observable<UpdateProfileResponse> {
    return this.http.get<UpdateProfileResponse>(`${this.API_BASE_URL}/auth/profile/`);
  }

  updateProfile(profileData: UpdateProfileRequest): Observable<UpdateProfileResponse> {
    return this.http
      .put<UpdateProfileResponse>(`${this.API_BASE_URL}/auth/profile/`, profileData)
      .pipe(
        tap((response) => {
          const currentUser = this.currentUser();
          if (!currentUser) {
            return;
          }
          const updatedUser: User = {
            ...currentUser,
            ...profileData,
            is_profile_completed: response.is_profile_completed,
            permissions:
              response.permissions !== undefined
                ? normalizeProfilePermissionCodes(response.permissions)
                : currentUser.permissions,
          };
          this.currentUser.set(updatedUser);
          localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
        })
      );
  }

  /** Developer API keys (`SessionToken` security in OpenAPI). */
  listApiKeys(): Observable<ManagedApiKey[]> {
    return this.http
      .get<unknown>(`${this.API_BASE_URL}/api-keys/`)
      .pipe(map((body) => parseApiKeysList(body)));
  }

  createApiKey(payload: ApiKeyCreateIn): Observable<ApiKeyCreateResult> {
    return this.http
      .post<unknown>(`${this.API_BASE_URL}/api-keys/`, payload)
      .pipe(map((body) => parseApiKeyCreated(body)));
  }

  updateApiKey(id: string, patch: ApiKeyPatchIn): Observable<ManagedApiKey> {
    return this.http
      .patch<unknown>(`${this.API_BASE_URL}/api-keys/${encodeURIComponent(id)}/`, patch)
      .pipe(
        map((body) => {
          const row = normalizeApiKeyRow(body);
          if (!row) {
            throw new Error('[api-keys] Unexpected update response shape');
          }
          return row;
        })
      );
  }

  deleteApiKey(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.API_BASE_URL}/api-keys/${encodeURIComponent(id)}/`)
      .pipe(map(() => void 0));
  }

  /**
   * Starts Google OAuth via browser-mode navigational form POST
   * (`POST .../auth/browser/v1/auth/provider/redirect`).
   */
  async startGoogleOAuth(
    callbackUrl: string,
    process: 'login' | 'connect' = 'login'
  ): Promise<{ kind: 'redirecting' } | { kind: 'error'; message: string }> {
    return await this.startProviderOAuth(ALLAUTH_SOCIAL_PROVIDER_GOOGLE, callbackUrl, process);
  }

  /**
   * Starts GitHub OAuth via browser-mode navigational form POST
   * (`POST .../auth/browser/v1/auth/provider/redirect`).
   */
  async startGitHubOAuth(
    callbackUrl: string,
    process: 'login' | 'connect' = 'login'
  ): Promise<{ kind: 'redirecting' } | { kind: 'error'; message: string }> {
    return await this.startProviderOAuth(ALLAUTH_SOCIAL_PROVIDER_GITHUB, callbackUrl, process);
  }

  private async startProviderOAuth(
    providerId: string,
    callbackUrl: string,
    process: 'login' | 'connect'
  ): Promise<{ kind: 'redirecting' } | { kind: 'error'; message: string }> {
    if (process === 'login') {
      this.tokenStore.clearSessionToken();
    }
    if (process === 'connect' && !this.tokenStore.getSessionToken()) {
      return {
        kind: 'error',
        message: 'Connecting a provider requires an app session token; sign in again.',
      };
    }
    if (!getDjangoCsrfTokenForRequest()) {
      await firstValueFrom(
        this.headless
          .getBrowserConfig()
          .pipe(catchError(() => of(undefined as ConfigurationResponse | undefined)))
      );
    }
    const result = await this.headless.redirectToProvider({
      provider: providerId,
      process,
      callbackUrl,
    });
    if (result.kind === 'error') {
      return { kind: 'error', message: result.message };
    }
    return { kind: 'redirecting' };
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? (JSON.parse(userStr) as User) : null;
  }

  isLoggedIn(): boolean {
    return authInfo(this.authSnapshot()).isAuthenticated;
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  verifyEmailWithKey(key: string): Observable<AuthenticatedOrChallenge> {
    return this.headless
      .verifyEmail({ key })
      .pipe(switchMap((r) => this.applyHeadlessSuccess(r, { fetchProfile: true })));
  }

  resendEmailVerification(): Observable<unknown> {
    return this.headless.resendEmailVerification();
  }

  readonly headlessAuth = this.headless;

  private readNextQueryParam(): string {
    const tree = this.router.parseUrl(this.router.url);
    const next = tree.queryParams['next'];
    return typeof next === 'string' && next.startsWith('/') ? next : ALLAUTH_LOGIN_REDIRECT_URL;
  }

  /**
   * While on headless social return routes, {@link OauthCallbackPage} owns post-OAuth navigation
   * (`next`, provider-signup). Skip global `LOGGED_IN` redirects here to avoid racing `/gallery`.
   */
  private isOAuthProviderCallbackRoute(): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    return path.endsWith('/account/provider/callback') || path.endsWith('/auth/oauth/callback');
  }

  private async handleAuthChangeEvent(evt: AuthChangeEventType, auth: unknown): Promise<void> {
    switch (evt) {
      case AuthChangeEvent.LOGGED_OUT:
        await this.router.navigateByUrl(ALLAUTH_LOGOUT_REDIRECT_URL);
        break;
      case AuthChangeEvent.LOGGED_IN:
        if (this.isOAuthProviderCallbackRoute()) {
          break;
        }
        await this.router.navigateByUrl(this.readNextQueryParam());
        break;
      case AuthChangeEvent.REAUTHENTICATED: {
        const next = this.readNextQueryParam();
        await this.router.navigateByUrl(next);
        break;
      }
      case AuthChangeEvent.REAUTHENTICATION_REQUIRED: {
        const flows = (auth as { data?: { flows?: Flow[] } })?.data?.flows;
        const flow = flows?.[0];
        if (!flow) {
          break;
        }
        const path = pathForFlow(flow);
        await this.router.navigate([path], {
          queryParams: { next: this.router.url },
          state: { reauth: auth },
        });
        break;
      }
      case AuthChangeEvent.FLOW_UPDATED: {
        const p = pathForPendingFlow(auth);
        if (!p) {
          console.error('[auth] FLOW_UPDATED without pending flow route');
          break;
        }
        await this.router.navigateByUrl(p);
        break;
      }
      default:
        break;
    }
  }
}
