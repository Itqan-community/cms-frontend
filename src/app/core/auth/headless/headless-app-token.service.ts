import { Injectable } from '@angular/core';
import type { AppTokenRefreshResponse, AuthenticationMeta } from './headless-api.types';

/** Storage keys for app-mode allauth (contract `meta.session_token` / `meta.access_token`). */
export const HEADLESS_SESSION_TOKEN_KEY = 'headless_session_token';
export const HEADLESS_ACCESS_TOKEN_KEY = 'headless_access_token';
export const HEADLESS_REFRESH_TOKEN_KEY = 'headless_refresh_token';

/**
 * No HttpClient — safe to inject from HTTP interceptors (avoids DI cycles with AuthService).
 */
@Injectable({ providedIn: 'root' })
export class HeadlessAppTokenService {
  getSessionToken(): string | null {
    return localStorage.getItem(HEADLESS_SESSION_TOKEN_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(HEADLESS_ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(HEADLESS_REFRESH_TOKEN_KEY);
  }

  setFromMeta(meta: AuthenticationMeta | undefined): void {
    if (!meta) {
      return;
    }
    if (meta.session_token) {
      localStorage.setItem(HEADLESS_SESSION_TOKEN_KEY, meta.session_token);
    }
    if (meta.access_token) {
      localStorage.setItem(HEADLESS_ACCESS_TOKEN_KEY, meta.access_token);
    }
    if (meta.refresh_token) {
      localStorage.setItem(HEADLESS_REFRESH_TOKEN_KEY, meta.refresh_token);
    }
  }

  /** After `POST .../tokens/refresh` — may omit `refresh_token` if rotation is off. */
  applyTokenRefreshResponse(res: AppTokenRefreshResponse): void {
    if (res.data?.access_token) {
      localStorage.setItem(HEADLESS_ACCESS_TOKEN_KEY, res.data.access_token);
    }
    if (res.data?.refresh_token) {
      localStorage.setItem(HEADLESS_REFRESH_TOKEN_KEY, res.data.refresh_token);
    }
  }

  clearSessionToken(): void {
    localStorage.removeItem(HEADLESS_SESSION_TOKEN_KEY);
  }

  clear(): void {
    localStorage.removeItem(HEADLESS_SESSION_TOKEN_KEY);
    localStorage.removeItem(HEADLESS_ACCESS_TOKEN_KEY);
    localStorage.removeItem(HEADLESS_REFRESH_TOKEN_KEY);
  }
}
