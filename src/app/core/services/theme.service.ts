import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { THEME_COOKIE } from '../i18n/ui-language';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

declare global {
  interface Window {
    /** Defined by public/theme-loader.js; resolves with the theme actually applied. */
    itqanApplyTheme?: (theme: AppTheme) => Promise<AppTheme>;
    /** The first-load theme from public/theme-loader.js; main.ts waits for it. */
    itqanThemeReady?: Promise<AppTheme>;
  }
}

/**
 * The light/dark colour theme. public/theme-loader.js applies the saved choice (or the OS
 * preference) before the app boots; this service reads that state and switches it later.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<AppTheme>(
    inject(DOCUMENT).documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  );
  readonly isDark = computed(() => this.theme() === 'dark');

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  /**
   * Switches and saves the choice. `theme` updates once the new styles are on screen; if the dark
   * styles fail to load, the theme stays light and nothing is saved.
   */
  set(theme: AppTheme): void {
    if (!window.itqanApplyTheme) {
      this.applied(theme);
      return;
    }
    void window.itqanApplyTheme(theme).then((applied) => {
      if (applied === theme) {
        this.applied(theme);
      } else {
        this.theme.set(applied);
        console.warn(`Could not load the ${theme} theme styles`);
      }
    });
  }

  private applied(theme: AppTheme): void {
    this.theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err: unknown) {
      console.warn('Could not save the theme preference', err);
    }
    if (typeof document !== 'undefined') {
      const secure = window.location?.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
    }
  }
}
