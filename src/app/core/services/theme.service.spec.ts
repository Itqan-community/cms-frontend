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
    document.cookie = 'theme=; Path=/; Max-Age=0';
  });

  afterEach(() => {
    window.itqanApplyTheme = savedApply;
    window.itqanThemeReady = savedReady;
    darkLink()?.remove();
    document.head
      .querySelectorAll('link[href*="antd-TEST"], noscript')
      .forEach((node) => node.remove());
    root.setAttribute('data-theme', 'light');
    root.setAttribute('data-ag-theme-mode', 'light');
    localStorage.removeItem('theme');
    document.cookie = 'theme=; Path=/; Max-Age=0';
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
      expect(document.cookie).toContain('theme=light');
    });

    it('handles an SSR-rendered antd-dark link without throwing', async () => {
      const ssrLink = document.createElement('link');
      ssrLink.id = 'antd-dark';
      ssrLink.rel = 'stylesheet';
      ssrLink.href = 'data:text/css,body{}';
      Object.defineProperty(ssrLink, 'sheet', { value: {}, configurable: true });
      document.head.appendChild(ssrLink);
      localStorage.setItem('theme', 'dark');

      await runThemeLoader();
      expect(await window.itqanThemeReady).toBe('dark');
      expect(document.cookie).toContain('theme=dark');
    });

    it('inserts #antd-dark directly into head and skips <noscript> links', async () => {
      const headAntd = document.createElement('link');
      headAntd.rel = 'stylesheet';
      headAntd.href = 'antd-TEST.css';
      const noscript = document.createElement('noscript');
      const noscriptAntd = document.createElement('link');
      noscriptAntd.rel = 'stylesheet';
      noscriptAntd.href = 'antd-TEST.css';
      noscript.appendChild(noscriptAntd);
      document.head.appendChild(headAntd);
      document.head.appendChild(noscript);
      localStorage.setItem('theme', 'dark');

      await runThemeLoader();
      const inserted = darkLink();
      expect(inserted).not.toBeNull();
      expect(inserted?.parentElement).toBe(document.head);
      await window.itqanThemeReady;
    });
  });

  it('starts from the theme the loader applied', () => {
    root.setAttribute('data-theme', 'dark');
    expect(TestBed.inject(ThemeService).isDark()).toBeTrue();
  });

  it('saves the choice and persists the theme cookie once the styles are applied', async () => {
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
    expect(document.cookie).toContain('theme=dark');
  });
});
