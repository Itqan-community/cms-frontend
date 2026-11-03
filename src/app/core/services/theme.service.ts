import { Injectable, computed, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

declare global {
  interface Window {
    /** Defined by the inline script in index.html, which also applies the theme on first load. */
    itqanApplyTheme?: (theme: AppTheme, onApplied?: () => void) => void;
  }
}

/**
 * The light/dark colour theme. index.html applies the saved choice (or the OS preference) before
 * the app boots; this service reads that state and switches it later.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<AppTheme>(
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  );
  readonly isDark = computed(() => this.theme() === 'dark');

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  /** Saves the choice and switches; `theme` updates once the new styles are on screen. */
  set(theme: AppTheme): void {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err: unknown) {
      console.warn('Could not save the theme preference', err);
    }
    if (window.itqanApplyTheme) {
      window.itqanApplyTheme(theme, () => this.theme.set(theme));
    } else {
      this.theme.set(theme);
    }
  }
}
