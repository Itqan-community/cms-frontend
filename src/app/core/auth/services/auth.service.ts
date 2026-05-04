import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  throwError,
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
import { applyAllauthEnvelopeSideEffects } from '../headless/allauth-envelope.util';
import { AllauthAuthChangeBus } from '../headless/allauth-auth-change.bus';
import type {
  AuthenticatedResponse,
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
import type { ProviderRedirectResult } from '../headless/headless-provider-redirect.util';
import { HeadlessAppTokenService } from '../headless/headless-app-token.service';
import {
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UpdateProfileResponse,
  User,
} from '../models/auth.model';
import { getDjangoCsrfTokenForRequest } from '../../utils/csrf.util';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly headless = inject(HeadlessAuthApiService);
  private readonly tokenStore = inject(HeadlessAppTokenService);
  private readonly authBus = inject(AllauthAuthChangeBus);

  /** When false (default app mode), hide/disabled browser OAuth buttons until redirect+callback are wired. */
  readonly oauthBrowserRedirectEnabled = environment.oauthBrowserRedirectEnabled;

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
          catchError(() => {
            this.authBootstrapFailed.set(true);
            return of(false as const);
          })
        ),
        config: this.headless.getConfig().pipe(catchError(() => of(undefined))),
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
    return this.headless.getSession().pipe(
      map((res) => {
        const info = authInfo(res);
        if (!info.isAuthenticated || res.status !== 200 || !info.user) {
          return false;
        }
        this.authSnapshot.set(res);
        this.tokenStore.setFromMeta(res.meta);
        this.syncUserFromSnapshot(res);
        return true;
      }),
      catchError(() => of(false))
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
   * After browser OAuth return: try app session first (`X-Session-Token` / server state), then
   * cookie-backed browser session so split-host deployments can still hydrate JWT from `meta`.
   *
   * `HttpClient` reports HTTP **401/403** on `GET …/session` as {@link HttpErrorResponse} — the
   * headless envelope is still JSON in {@link HttpErrorResponse.error}. Normalize that stream so we
   * can fall through to `/auth/browser/…/session` (staging HARs showed only **app** `/session` unless
   * this unwrap runs — GitHub can still complete OAuth server-side without a visible authorize UI).
   */
  bootstrapSessionAfterOAuthRedirect(options?: {
    fetchProfile?: boolean;
  }): Observable<AuthenticatedOrChallenge> {
    const fetchProfile = options?.fetchProfile;
    return this.headless.getSession().pipe(
      catchError((err) => this.observableHeadlessEnvelopeFromSessionHttpFailure(err)),
      switchMap((appRes) => {
        if (this.isOauthReturnSessionEstablished(appRes)) {
          return this.applyHeadlessSuccess(appRes, { fetchProfile });
        }
        return this.headless.getBrowserSession().pipe(
          catchError((err) => this.observableHeadlessEnvelopeFromSessionHttpFailure(err)),
          switchMap((browserRes) =>
            this.applyHeadlessSuccess(
              this.isOauthReturnSessionEstablished(browserRes) ? browserRes : appRes,
              { fetchProfile }
            )
          ),
          catchError(() => this.applyHeadlessSuccess(appRes, { fetchProfile }))
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
          const merged = { ...base, ...p, id: String(p.id ?? base.id) };
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

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_BASE_URL}/auth/profile/`);
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
          if (currentUser && response.is_profile_completed) {
            const updatedUser = {
              ...currentUser,
              is_profile_completed: response.is_profile_completed,
              ...profileData,
            };
            this.currentUser.set(updatedUser);
            localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
          }
        })
      );
  }

  /**
   * Starts Google OAuth via headless browser client provider redirect (`POST .../auth/browser/v1/auth/provider/redirect`).
   * Requires `environment.oauthBrowserRedirectEnabled`.
   */
  async startGoogleOAuth(
    callbackUrl: string,
    process: 'login' | 'connect' = 'login'
  ): Promise<ProviderRedirectResult> {
    return await this.startProviderOAuth(ALLAUTH_SOCIAL_PROVIDER_GOOGLE, callbackUrl, process);
  }

  /**
   * Starts GitHub OAuth via headless browser client provider redirect (`POST .../auth/browser/v1/auth/provider/redirect`).
   * Requires `environment.oauthBrowserRedirectEnabled`.
   */
  async startGitHubOAuth(
    callbackUrl: string,
    process: 'login' | 'connect' = 'login'
  ): Promise<ProviderRedirectResult> {
    return await this.startProviderOAuth(ALLAUTH_SOCIAL_PROVIDER_GITHUB, callbackUrl, process);
  }

  private async startProviderOAuth(
    providerId: string,
    callbackUrl: string,
    process: 'login' | 'connect'
  ): Promise<ProviderRedirectResult> {
    if (!this.oauthBrowserRedirectEnabled) {
      const result: ProviderRedirectResult = {
        kind: 'error',
        message: `${providerId} OAuth redirect is disabled (oauthBrowserRedirectEnabled=false).`,
      };
      this.applyProviderRedirectResult(result);
      return result;
    }
    if (process === 'login') {
      // Avoid stale app session binding before an anonymous provider-login redirect.
      this.tokenStore.clearSessionToken();
    }
    const sessionToken = process === 'connect' ? this.tokenStore.getSessionToken() : undefined;
    if (process === 'connect' && !sessionToken) {
      const result: ProviderRedirectResult = {
        kind: 'error',
        message: 'Connecting a provider requires an app session token; sign in again.',
      };
      this.applyProviderRedirectResult(result);
      return result;
    }
    /*
     * Browser OAuth POST is CSRF-protected. App bootstrap loads `/auth/app/v1/config` without
     * cookies, so `csrftoken` is never minted unless we prime `/auth/browser/v1/config`.
     */
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
    this.applyProviderRedirectResult(result);
    return result;
  }

  /** Applies POST/OAuth outcome from {@link HeadlessAuthApiService.redirectToProvider}. */
  applyProviderRedirectResult(result: ProviderRedirectResult): void {
    switch (result.kind) {
      case 'form_submitted':
        return;
      case 'json':
        applyAllauthEnvelopeSideEffects(result.body, this.tokenStore, this.authBus);
        return;
      case 'error':
        console.error('[auth] Provider redirect failed:', result.message);
        return;
      default:
        return;
    }
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
