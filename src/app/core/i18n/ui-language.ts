import { isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, PLATFORM_ID, REQUEST_CONTEXT } from '@angular/core';

export type UiLanguage = 'ar' | 'en';

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'ar';
export const UI_LANGUAGES: readonly UiLanguage[] = ['ar', 'en'];

/** `?lang=en` picks the language for one URL (hreflang links point at it). */
export const LANG_QUERY_PARAM = 'lang';
/** Mirrors `localStorage.lang` so the SSR server renders the language the user chose. */
export const LANG_COOKIE = 'lang';
export const THEME_COOKIE = 'theme';
const LANG_STORAGE_KEY = 'lang';
const LANG_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type UiLanguageSource = 'query' | 'storage' | 'cookie' | 'default';

/** What the SSR server passes to the app as `REQUEST_CONTEXT`. */
export interface SsrRequestContext {
  lang: UiLanguage;
  /** True when the request explicitly selected a language via `?lang=`. */
  fromQuery?: boolean;
  /** Initial colour theme from the `theme` cookie so SSR matches the user's mode. */
  theme?: 'light' | 'dark';
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

export function resolveRequestTheme(
  cookieHeader: string | null | undefined
): 'light' | 'dark' | null {
  const value = readCookie(cookieHeader, THEME_COOKIE);
  return value === 'dark' || value === 'light' ? value : null;
}

export function hasRequestLanguageQuery(url: URL): boolean {
  return normalizeUiLanguage(url.searchParams.get(LANG_QUERY_PARAM)) !== null;
}

const PUBLIC_SSR_PATH_PATTERNS = [
  /^\/gallery$/,
  /^\/gallery\/asset\/[^/]+$/,
  /^\/publisher\/[^/]+$/,
  /^\/reciters$/,
  /^\/reciters\/[^/]+$/,
  /^\/license\/[^/]+$/,
  /^\/content-standards$/,
];

/** True for public SSR-rendered routes (with optional trailing slash). */
export function isPublicSsrPath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PUBLIC_SSR_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
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

/** Browser: `?lang=` first, then the saved choice (localStorage, then cookie), then Arabic, with its source. */
export function resolveBrowserLanguageWithSource(search = window.location.search): {
  lang: UiLanguage;
  source: UiLanguageSource;
} {
  const fromQuery = normalizeUiLanguage(new URLSearchParams(search).get(LANG_QUERY_PARAM));
  if (fromQuery) return { lang: fromQuery, source: 'query' };

  const stored = readStoredLanguage();
  if (stored) return { lang: stored, source: 'storage' };

  const fromCookie = normalizeUiLanguage(readCookie(document.cookie, LANG_COOKIE));
  if (fromCookie) return { lang: fromCookie, source: 'cookie' };

  return { lang: DEFAULT_UI_LANGUAGE, source: 'default' };
}

/** Browser: `?lang=` first, then the saved choice (localStorage, then cookie), then Arabic. */
export function resolveBrowserLanguage(): UiLanguage {
  return resolveBrowserLanguageWithSource().lang;
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

/** True when this app instance resolved its UI language from an explicit `?lang=` query param. */
export const UI_LANGUAGE_FROM_QUERY = new InjectionToken<boolean>('UI_LANGUAGE_FROM_QUERY', {
  providedIn: 'root',
  factory: () => {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      return resolveBrowserLanguageWithSource().source === 'query';
    }
    const context = inject(REQUEST_CONTEXT, { optional: true }) as SsrRequestContext | null;
    return !!context?.fromQuery;
  },
});

/** Query params preserving `?lang=en` across public internal navigation links. */
export const LANG_QUERY_PARAMS = new InjectionToken<Record<string, string> | null>(
  'LANG_QUERY_PARAMS',
  {
    providedIn: 'root',
    factory: () => (inject(UI_LANGUAGE) === 'en' ? { [LANG_QUERY_PARAM]: 'en' } : null),
  }
);
