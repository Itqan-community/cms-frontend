import { Injectable } from '@angular/core';
import { DJANGO_SESSIONID_COOKIE_NAME, getCookie } from '../../utils/csrf.util';
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
  /**
   * When true, ignore readable `sessionid` cookie fallback (logout / 410).
   * Prevents re-attaching a dead token as `X-Session-Token` on same-origin hosts.
   */
  private sessionCookieFallbackBlocked = false;

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

  /**
   * Resolved value for `X-Session-Token`: **sessionStorage first**, then readable `sessionid` cookie.
   * Cookie fallback is persisted into sessionStorage so subsequent reads stay consistent.
   */
  getSessionToken(): string | null {
    if (this.sessionCookieFallbackBlocked) {
      return null;
    }
    this.migrateLegacyOnce();
    try {
      const fromStorage = sessionStorage.getItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY);
      if (fromStorage) {
        return fromStorage;
      }
    } catch {
      return null;
    }
    const fromCookie = getCookie(DJANGO_SESSIONID_COOKIE_NAME);
    if (fromCookie) {
      this.setSessionToken(fromCookie);
      return fromCookie;
    }
    return null;
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

  blockSessionCookieFallback(): void {
    this.sessionCookieFallbackBlocked = true;
    this.clearSessionToken();
  }

  unblockSessionCookieFallback(): void {
    this.sessionCookieFallbackBlocked = false;
  }

  isSessionCookieFallbackBlocked(): boolean {
    return this.sessionCookieFallbackBlocked;
  }

  /** Persist tokens from headless `meta` when backend sends them. */
  setFromMeta(meta: AuthenticationMeta | undefined): void {
    if (!meta || this.sessionCookieFallbackBlocked) {
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
