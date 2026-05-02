import { Injectable } from '@angular/core';
import type { AppTokenRefreshResponse, AuthenticationMeta } from './headless-api.types';

/** Official SPA stores session continuity under this `sessionStorage` key. */
export const ALLAUTH_SESSION_TOKEN_STORAGE_KEY = 'sessionToken';

const LEGACY_SESSION_KEY = 'headless_session_token';
const HEADLESS_ACCESS_TOKEN_KEY = 'headless_access_token';
const HEADLESS_REFRESH_TOKEN_KEY = 'headless_refresh_token';

/**
 * App-mode session token storage (+ optional legacy JWT fields if backend still emits them).
 * Injectable from HTTP interceptors (no HttpClient).
 */
@Injectable({ providedIn: 'root' })
export class HeadlessAppTokenService {
  private legacyMigrated = false;

  private migrateLegacyOnce(): void {
    if (this.legacyMigrated) {
      return;
    }
    this.legacyMigrated = true;
    try {
      const oldSession = localStorage.getItem(LEGACY_SESSION_KEY);
      if (
        oldSession &&
        typeof sessionStorage !== 'undefined' &&
        !sessionStorage.getItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY)
      ) {
        sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, oldSession);
      }
      localStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      /* storage unavailable */
    }
  }

  getSessionToken(): string | null {
    this.migrateLegacyOnce();
    try {
      return sessionStorage.getItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  setSessionToken(token: string): void {
    try {
      sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, token);
      localStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }

  clearSessionToken(): void {
    try {
      sessionStorage.removeItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(HEADLESS_ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(HEADLESS_REFRESH_TOKEN_KEY);
  }

  /** Persist tokens from headless `meta` when backend sends them. */
  setFromMeta(meta: AuthenticationMeta | undefined): void {
    if (!meta) {
      return;
    }
    if (meta.session_token) {
      this.setSessionToken(meta.session_token);
    }
    if (meta.access_token) {
      localStorage.setItem(HEADLESS_ACCESS_TOKEN_KEY, meta.access_token);
    }
    if (meta.refresh_token) {
      localStorage.setItem(HEADLESS_REFRESH_TOKEN_KEY, meta.refresh_token);
    }
  }

  /** After `POST .../tokens/refresh` — kept for backends that still rotate JWTs. */
  applyTokenRefreshResponse(res: AppTokenRefreshResponse): void {
    if (res.data?.access_token) {
      localStorage.setItem(HEADLESS_ACCESS_TOKEN_KEY, res.data.access_token);
    }
    if (res.data?.refresh_token) {
      localStorage.setItem(HEADLESS_REFRESH_TOKEN_KEY, res.data.refresh_token);
    }
  }

  clear(): void {
    this.clearSessionToken();
    localStorage.removeItem(HEADLESS_ACCESS_TOKEN_KEY);
    localStorage.removeItem(HEADLESS_REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }
}
