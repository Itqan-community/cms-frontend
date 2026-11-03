import { TestBed } from '@angular/core/testing';
import { AppTheme, ThemeService } from './theme.service';

/** Runs public/theme-loader.js (served from public/ by the test build) as index.html does. */
async function runThemeLoader(): Promise<void> {
  const response = await fetch('/theme-loader.js');
  expect(response.ok).withContext('theme-loader.js is served').toBeTrue();
  new Function(await response.text())();
}

describe('ThemeService', () => {
  const root = document.documentElement;
  let savedApply: typeof window.itqanApplyTheme;
  let savedReady: typeof window.itqanThemeReady;

  const darkLink = () => document.getElementById('antd-dark') as HTMLLinkElement | null;

  beforeEach(() => {
    savedApply = window.itqanApplyTheme;
    savedReady = window.itqanThemeReady;
    localStorage.removeItem('theme');
  });

  afterEach(() => {
    window.itqanApplyTheme = savedApply;
    window.itqanThemeReady = savedReady;
    darkLink()?.remove();
    root.setAttribute('data-theme', 'light');
    root.setAttribute('data-ag-theme-mode', 'light');
    localStorage.removeItem('theme');
  });

  describe('with the real theme loader', () => {
    it('applies a saved dark theme on first load, with the dark NG-ZORRO styles', async () => {
      localStorage.setItem('theme', 'dark');
      await runThemeLoader();

      expect(root.getAttribute('data-theme')).toBe('dark');
      expect(root.getAttribute('data-ag-theme-mode')).toBe('dark');
      expect(darkLink()?.getAttribute('href')).toBe('antd-dark.css');

      // The test server has no antd-dark.css, so the load fails: the loader falls back to light.
      expect(await window.itqanThemeReady).toBe('light');
      expect(root.getAttribute('data-theme')).toBe('light');
      expect(darkLink()).toBeNull();
    });

    it('keeps light and saves nothing when the dark styles fail to load', async () => {
      localStorage.setItem('theme', 'light');
      await runThemeLoader();
      const service = TestBed.inject(ThemeService);

      service.set('dark');
      const link = darkLink() as HTMLLinkElement & { loaded: Promise<boolean> };
      expect(await link.loaded).toBeFalse();
      await Promise.resolve();

      expect(service.isDark()).toBeFalse();
      expect(root.getAttribute('data-theme')).toBe('light');
      expect(localStorage.getItem('theme')).toBe('light');
    });
  });

  it('starts from the theme the loader applied', () => {
    root.setAttribute('data-theme', 'dark');
    expect(TestBed.inject(ThemeService).isDark()).toBeTrue();
  });

  it('saves the choice and switches once the styles are applied', async () => {
    let finish!: (theme: AppTheme) => void;
    window.itqanApplyTheme = jasmine
      .createSpy('itqanApplyTheme')
      .and.returnValue(new Promise<AppTheme>((resolve) => (finish = resolve)));
    const service = TestBed.inject(ThemeService);

    service.toggle();
    expect(window.itqanApplyTheme).toHaveBeenCalledWith('dark');
    expect(service.isDark()).toBeFalse();
    expect(localStorage.getItem('theme')).toBeNull();

    finish('dark');
    await Promise.resolve();
    await Promise.resolve();

    expect(service.isDark()).toBeTrue();
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
