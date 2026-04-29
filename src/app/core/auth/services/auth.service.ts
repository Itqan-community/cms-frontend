import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AuthenticatedResponse,
  AuthenticationMeta,
  HeadlessUser,
} from '../headless/headless-api.types';
import { HeadlessAppTokenService } from '../headless/headless-app-token.service';
import {
  HeadlessAuthApiService,
  submitProviderRedirectForm,
} from '../headless/headless-auth-api.service';
import {
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UpdateProfileResponse,
  User,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly headless = inject(HeadlessAuthApiService);
  private readonly tokenStore = inject(HeadlessAppTokenService);

  private readonly API_BASE_URL = environment.API_BASE_URL;
  private readonly USER_KEY = 'user';

  public isAuthenticated = signal(false);
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

  constructor() {
    this.loadHeadlessConfig();
    this.initializeAuth();
  }

  private loadHeadlessConfig(): void {
    this.headless.getConfig().subscribe({
      next: (res) => {
        const a = res.data?.account;
        this.authConfig.set({
          loginByCodeEnabled: a?.login_by_code_enabled ?? false,
          openSignup: a?.is_open_for_signup ?? true,
          emailVerifyByCode: a?.email_verification_by_code_enabled ?? false,
          passwordResetByCodeEnabled: a?.password_reset_by_code_enabled ?? false,
        });
      },
      error: () => this.authConfig.set(null),
    });
  }

  private initializeAuth(): void {
    const restoredFromStorage = this.restoreAuthFromStorage();
    this.headless.getSession().subscribe({
      next: (res) => {
        this.applyAuthenticatedResponse(res, { fetchProfile: true });
      },
      error: () => {
        if (!restoredFromStorage) {
          this.isAuthenticated.set(false);
          this.authStateSubject.next(false);
        }
      },
    });
  }

  /**
   * Restores UI auth state after hard reload from persisted user + token storage.
   * Server session is still revalidated by `getSession()` immediately after restore.
   */
  private restoreAuthFromStorage(): boolean {
    const user = this.getStoredUser();
    const hasToken = !!this.tokenStore.getSessionToken() || !!this.tokenStore.getAccessToken();
    if (!user || !hasToken) {
      return false;
    }
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.authStateSubject.next(true);
    return true;
  }

  /**
   * After 401/403 on a protected CMS API call: re-sync via `GET .../auth/session` (sends
   * `X-Session-Token`); updates stored tokens from response `meta`. Used by `auth-error.interceptor`.
   */
  sessionRecheckAfter401(): Observable<boolean> {
    return this.headless.getSession().pipe(
      map((res) => {
        if (res.meta?.is_authenticated && res.data?.user) {
          this.applyAuthenticatedResponse(res, { fetchProfile: false });
          return true;
        }
        return false;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Clear local auth UI state and go to login without calling the server (session already invalid).
   */
  invalidateClientAuthAndGoLogin(): void {
    this.clearClientAuthData();
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.authStateSubject.next(false);
    void this.router.navigate(['/login']);
  }

  /**
   * Persists `meta.session_token` / `meta.access_token` from headless responses (contract fields as-is).
   */
  applyMetaTokens(meta: AuthenticationMeta | undefined): void {
    this.tokenStore.setFromMeta(meta);
  }

  /** After OAuth redirect or email link — refresh app session from `GET .../auth/session`. */
  bootstrapSessionFromServer(options?: {
    fetchProfile: boolean;
  }): Observable<AuthenticatedResponse> {
    return this.headless
      .getSession()
      .pipe(
        tap((res) =>
          this.applyAuthenticatedResponse(res, { fetchProfile: options?.fetchProfile !== false })
        )
      );
  }

  /**
   * After successful headless step: persist `meta` tokens, then re-check session if user
   * or `access_token` is missing (contract completion via `GET .../auth/session`).
   */
  applyHeadlessSuccess(
    res: AuthenticatedResponse,
    options?: { fetchProfile?: boolean }
  ): Observable<AuthenticatedResponse> {
    this.applyMetaTokens(res.meta);
    const fetchProfile = options?.fetchProfile !== false;
    if (res.meta?.is_authenticated && (!res.data?.user || !res.meta?.access_token)) {
      return this.bootstrapSessionFromServer({ fetchProfile });
    }
    this.applyAuthenticatedResponse(res, { fetchProfile });
    return of(res);
  }

  private applyAuthenticatedResponse(
    res: AuthenticatedResponse,
    opts: { fetchProfile?: boolean } = {}
  ): void {
    this.applyMetaTokens(res.meta);
    if (res.meta?.is_authenticated && res.data?.user) {
      const u = this.mapHeadlessToUser(res.data.user);
      this.currentUser.set(u);
      this.setUserStorage(u);
      this.isAuthenticated.set(true);
      this.authStateSubject.next(true);
      if (opts.fetchProfile) {
        this.getProfile().subscribe({
          next: (p) => {
            const cur = this.currentUser();
            if (cur) {
              const merged = { ...cur, ...p, id: String(p.id ?? cur.id) };
              this.currentUser.set(merged);
              this.setUserStorage(merged);
            }
          },
          error: () => {
            /* profile endpoint may be unavailable; keep headless user */
          },
        });
      }
    } else {
      // Keep tokens when `meta` still carries a session (multi-step app flows); otherwise drop.
      if (!res.meta?.session_token && !res.meta?.access_token) {
        this.tokenStore.clear();
      }
      localStorage.removeItem(this.USER_KEY);
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
      this.authStateSubject.next(false);
    }
    this.isLoading.set(false);
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

  login(credentials: LoginRequest): Observable<AuthenticatedResponse> {
    this.isLoading.set(true);
    return this.headless.login(credentials).pipe(
      switchMap((response) => this.applyHeadlessSuccess(response, { fetchProfile: true })),
      catchError((error) => {
        this.isLoading.set(false);
        throw error;
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthenticatedResponse> {
    this.isLoading.set(true);
    const body: Record<string, unknown> = { email: userData.email, password: userData.password };
    if (userData.phone) {
      body['phone'] = userData.phone;
    }
    return this.headless.signup(body).pipe(
      switchMap((response) => this.applyHeadlessSuccess(response, { fetchProfile: true })),
      catchError((error) => {
        this.isLoading.set(false);
        throw error;
      })
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
    this.clearClientAuthData();
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.authStateSubject.next(false);
    void this.router.navigate(['/login']);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_BASE_URL}/auth/profile/`);
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
            this.setUserStorage(updatedUser);
          }
        })
      );
  }

  startGoogleOAuth(callbackUrl: string, process: 'login' | 'connect' = 'login'): void {
    const url = this.headless.buildProviderRedirectUrl();
    submitProviderRedirectForm(url, { provider: 'google', process, callback_url: callbackUrl });
  }

  startGitHubOAuth(callbackUrl: string, process: 'login' | 'connect' = 'login'): void {
    const url = this.headless.buildProviderRedirectUrl();
    submitProviderRedirectForm(url, { provider: 'github', process, callback_url: callbackUrl });
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? (JSON.parse(userStr) as User) : null;
  }

  private setUserStorage(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private clearClientAuthData(): void {
    localStorage.removeItem(this.USER_KEY);
    this.tokenStore.clear();
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  verifyEmailWithKey(key: string): Observable<AuthenticatedResponse> {
    return this.headless
      .verifyEmail({ key })
      .pipe(switchMap((r) => this.applyHeadlessSuccess(r, { fetchProfile: true })));
  }

  resendEmailVerification(): Observable<unknown> {
    return this.headless.resendEmailVerification();
  }

  /** Expose headless API for auth flows (code, passkey, MFA, password reset, email). */
  readonly headlessAuth = this.headless;
}
