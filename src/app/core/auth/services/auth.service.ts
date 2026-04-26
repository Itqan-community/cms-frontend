import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, of, switchMap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  User,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '../models/auth.model';
import {
  HeadlessAuthApiService,
  submitProviderRedirectForm,
} from '../headless/headless-auth-api.service';
import type { AuthenticatedResponse, HeadlessUser } from '../headless/headless-api.types';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly headless = inject(HeadlessAuthApiService);

  private readonly API_BASE_URL = environment.API_BASE_URL;
  /** JWT for CMS API (from headless meta.access_token when issued) */
  private readonly TOKEN_KEY = 'headless_access_token';
  /** Legacy key — read once for migration */
  private readonly LEGACY_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'headless_refresh_token';
  private readonly LEGACY_REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  public isAuthenticated = signal(false);
  public currentUser = signal<User | null>(null);
  public isLoading = signal(false);
  public authConfig = signal<{
    loginByCodeEnabled: boolean;
    openSignup: boolean;
    emailVerifyByCode: boolean;
  } | null>(null);

  private authStateSubject = new BehaviorSubject<boolean>(false);
  public authState$ = this.authStateSubject.asObservable();

  constructor() {
    this.migrateLegacyTokens();
    this.loadHeadlessConfig();
    this.initializeAuth();
  }

  private migrateLegacyTokens(): void {
    if (!localStorage.getItem(this.TOKEN_KEY) && localStorage.getItem(this.LEGACY_TOKEN_KEY)) {
      const a = localStorage.getItem(this.LEGACY_TOKEN_KEY);
      if (a) {
        localStorage.setItem(this.TOKEN_KEY, a);
      }
      localStorage.removeItem(this.LEGACY_TOKEN_KEY);
    }
    if (
      !localStorage.getItem(this.REFRESH_TOKEN_KEY) &&
      localStorage.getItem(this.LEGACY_REFRESH_KEY)
    ) {
      const r = localStorage.getItem(this.LEGACY_REFRESH_KEY);
      if (r) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, r);
      }
      localStorage.removeItem(this.LEGACY_REFRESH_KEY);
    }
  }

  private loadHeadlessConfig(): void {
    this.headless.getConfig().subscribe({
      next: (res) => {
        const a = res.data?.account;
        this.authConfig.set({
          loginByCodeEnabled: a?.login_by_code_enabled ?? false,
          openSignup: a?.is_open_for_signup ?? true,
          emailVerifyByCode: a?.email_verification_by_code_enabled ?? false,
        });
      },
      error: () => this.authConfig.set(null),
    });
  }

  private initializeAuth(): void {
    this.headless.getSession().subscribe({
      next: (res) => {
        this.applyAuthenticatedResponse(res, { fetchProfile: true });
      },
      error: () => {
        const token = this.getToken();
        const user = this.getStoredUser();
        if (token && user) {
          this.isAuthenticated.set(true);
          this.currentUser.set(user);
          this.authStateSubject.next(true);
        }
      },
    });
  }

  /** After OAuth redirect or email link — refresh session from cookies + tokens. */
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
   * Contract alignment: after successful browser auth flows, re-check session to hydrate
   * token metadata when login/signup response itself does not include `meta.access_token`.
   */
  applyHeadlessSuccess(
    res: AuthenticatedResponse,
    options?: { fetchProfile?: boolean }
  ): Observable<AuthenticatedResponse> {
    const fetchProfile = options?.fetchProfile !== false;
    if (res.meta?.is_authenticated && !res.meta?.access_token) {
      return this.bootstrapSessionFromServer({ fetchProfile });
    }
    this.applyAuthenticatedResponse(res, { fetchProfile });
    return of(res);
  }

  private applyAuthenticatedResponse(
    res: AuthenticatedResponse,
    opts: { fetchProfile?: boolean } = {}
  ): void {
    if (res.meta?.access_token) {
      this.setToken(res.meta.access_token);
    }
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
        this.performLogout();
      }),
      catchError(() => {
        this.performLogout();
        return of(void 0);
      }),
      switchMap(() => of(void 0))
    );
  }

  private performLogout(): void {
    this.clearAuthData();
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.authStateSubject.next(false);
    this.router.navigate(['/login']);
  }

  /**
   * Uses `/auth/app/v1/tokens/refresh` when a refresh token was stored (headless `meta` or app mode).
   */
  refreshToken(): Observable<{ access_token: string; refresh_token?: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.performLogout();
      return of({ access_token: '' });
    }
    return this.headless.refreshAppTokens({ refresh_token: refreshToken }).pipe(
      tap((response) => {
        this.setToken(response.data.access_token);
        if (response.data.refresh_token) {
          this.setRefreshToken(response.data.refresh_token);
        }
      }),
      map((response) => ({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
      })),
      catchError((error) => {
        this.performLogout();
        throw error;
      })
    );
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

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) ?? localStorage.getItem(this.LEGACY_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return (
      localStorage.getItem(this.REFRESH_TOKEN_KEY) ?? localStorage.getItem(this.LEGACY_REFRESH_KEY)
    );
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? (JSON.parse(userStr) as User) : null;
  }

  setAccessTokenFromMeta(access: string, refresh?: string): void {
    this.setToken(access);
    if (refresh) {
      this.setRefreshToken(refresh);
    }
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private setRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  private setUserStorage(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.LEGACY_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.LEGACY_REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
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
