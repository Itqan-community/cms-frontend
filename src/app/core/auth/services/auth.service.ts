import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly API_BASE_URL = environment.API_BASE_URL;
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  // Signals for reactive state management
  public isAuthenticated = signal(false);
  public currentUser = signal<User | null>(null);
  public isLoading = signal(false);

  private authStateSubject = new BehaviorSubject<boolean>(false);
  public authState$ = this.authStateSubject.asObservable();

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.getToken();
    const user = this.getStoredUser();

    if (token && user) {
      this.isAuthenticated.set(true);
      this.currentUser.set(user);
      this.authStateSubject.next(true);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.API_BASE_URL}/auth/login/`, credentials).pipe(
      tap((response) => {
        this.setAuthData(response);
        this.isAuthenticated.set(true);
        this.currentUser.set(response.user);
        this.authStateSubject.next(true);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        throw error;
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.API_BASE_URL}/auth/register/`, userData).pipe(
      tap((response) => {
        this.setAuthData(response);
        this.isAuthenticated.set(true);
        this.currentUser.set(response.user);
        this.authStateSubject.next(true);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        throw error;
      })
    );
  }

  logout(): Observable<void> {
    // const token = this.getToken();

    // Call logout endpoint if token exists
    // if (token) {
    //   return this.http.post<void>(`${this.API_BASE_URL}/auth/logout/`, {})
    //     .pipe(
    //       tap(() => {
    //         this.performLogout();
    //       }),
    //       catchError(() => {
    //         // Even if logout fails on server, clear local data
    //         this.performLogout();
    //         return of();
    //       })
    //     );
    // } else {
    this.performLogout();
    return of();
    // }
  }

  private performLogout(): void {
    this.clearAuthData();
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.authStateSubject.next(false);
    window.location.reload();
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.performLogout();
      return of({ access: '', refresh: '' });
    }

    const refreshData: RefreshTokenRequest = {
      refresh: refreshToken,
    };

    return this.http
      .post<RefreshTokenResponse>(`${this.API_BASE_URL}/auth/token/refresh/`, refreshData)
      .pipe(
        tap((response) => {
          // Update both access and refresh tokens
          this.setToken(response.access);
          this.setRefreshToken(response.refresh);
        }),
        catchError((error) => {
          this.performLogout();
          throw error;
        })
      );
  }

  /**
   * Get user profile
   */
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_BASE_URL}/auth/profile/`);
  }

  /**
   * Update user profile
   */
  updateProfile(profileData: UpdateProfileRequest): Observable<UpdateProfileResponse> {
    return this.http
      .put<UpdateProfileResponse>(`${this.API_BASE_URL}/auth/profile/`, profileData)
      .pipe(
        tap((response) => {
          // Update the current user if profile was completed
          const currentUser = this.currentUser();
          if (currentUser && response.is_profile_completed) {
            const updatedUser = {
              ...currentUser,
              profile_completed: response.is_profile_completed,
              ...profileData,
            };
            this.currentUser.set(updatedUser);
            this.setUser(updatedUser);
          }
        })
      );
  }

  /**
   * Start OAuth flow
   */
  startGoogleOAuth(): void {
    window.location.href = `${this.API_BASE_URL}/auth/oauth/google/start/`;
  }

  startGitHubOAuth(): void {
    window.location.href = `${this.API_BASE_URL}/auth/oauth/github/start/`;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  private setAuthData(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private setRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }
}
