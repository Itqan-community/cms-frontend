import { isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, PLATFORM_ID, REQUEST_CONTEXT } from '@angular/core';

export type UiLanguage = 'ar' | 'en';

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'ar';
export const UI_LANGUAGES: readonly UiLanguage[] = ['ar', 'en'];

/** `?lang=en` picks the language for one URL (hreflang links point at it). */
export const LANG_QUERY_PARAM = 'lang';
/** Mirrors `localStorage.lang` so the SSR server renders the language the user chose. */
export const LANG_COOKIE = 'lang';
const LANG_STORAGE_KEY = 'lang';
const LANG_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** What the SSR server passes to the app as `REQUEST_CONTEXT`. */
export interface SsrRequestContext {
  lang: UiLanguage;
  /** API origin the server fetches → origin the browser fetches (see app.config.server.ts). */
  transferCacheOriginMap?: Record<string, string>;
}

export function normalizeUiLanguage(value: unknown): UiLanguage | null {
  return typeof value === 'string' && (UI_LANGUAGES as readonly string[]).includes(value)
    ? (value as UiLanguage)
    : null;
}

export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * The language a request renders in: `?lang=` first, then the `lang` cookie, then Arabic.
 * `fromCookie` tells the server the HTML depends on the cookie (so it must not be shared-cached).
 */
export function resolveRequestLanguage(
  url: URL,
  cookieHeader: string | null | undefined
): { lang: UiLanguage; fromCookie: boolean } {
  const fromQuery = normalizeUiLanguage(url.searchParams.get(LANG_QUERY_PARAM));
  if (fromQuery) return { lang: fromQuery, fromCookie: false };
  const fromCookie = normalizeUiLanguage(readCookie(cookieHeader, LANG_COOKIE));
  if (fromCookie) return { lang: fromCookie, fromCookie: true };
  return { lang: DEFAULT_UI_LANGUAGE, fromCookie: false };
}

function readStoredLanguage(): UiLanguage | null {
  try {
    return normalizeUiLanguage(localStorage.getItem(LANG_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Browser: `?lang=` first, then the saved choice (localStorage, then cookie), then Arabic. */
export function resolveBrowserLanguage(): UiLanguage {
  const fromQuery = normalizeUiLanguage(
    new URLSearchParams(window.location.search).get(LANG_QUERY_PARAM)
  );
  return (
    fromQuery ??
    readStoredLanguage() ??
    normalizeUiLanguage(readCookie(document.cookie, LANG_COOKIE)) ??
    DEFAULT_UI_LANGUAGE
  );
}

/** Saves the choice in localStorage and in the cookie the SSR server reads. */
export function persistUiLanguage(lang: UiLanguage): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* storage blocked: the cookie still carries the choice */
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** The UI language for this app instance. It only changes through a page reload. */
export const UI_LANGUAGE = new InjectionToken<UiLanguage>('UI_LANGUAGE', {
  providedIn: 'root',
  factory: () => {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      return resolveBrowserLanguage();
    }
    const context = inject(REQUEST_CONTEXT, { optional: true }) as SsrRequestContext | null;
    return normalizeUiLanguage(context?.lang) ?? DEFAULT_UI_LANGUAGE;
  },
});
