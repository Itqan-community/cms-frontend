import {
  hasRequestLanguageQuery,
  isPublicSsrPath,
  readCookie,
  resolveBrowserLanguageWithSource,
  resolveRequestLanguage,
  resolveRequestTheme,
} from './ui-language';

describe('ui-language', () => {
  const url = (query = '') => new URL(`https://cms.itqan.dev/gallery${query}`);

  beforeEach(() => {
    localStorage.removeItem('lang');
    document.cookie = 'lang=; Path=/; Max-Age=0';
  });

  afterEach(() => {
    localStorage.removeItem('lang');
    document.cookie = 'lang=; Path=/; Max-Age=0';
  });

  describe('resolveRequestLanguage', () => {
    it('defaults to Arabic', () => {
      expect(resolveRequestLanguage(url(), undefined)).toEqual({ lang: 'ar', fromCookie: false });
    });

    it('uses the lang cookie', () => {
      expect(resolveRequestLanguage(url(), 'a=1; lang=en')).toEqual({
        lang: 'en',
        fromCookie: true,
      });
    });

    it('lets ?lang= win over the cookie', () => {
      expect(resolveRequestLanguage(url('?lang=ar'), 'lang=en')).toEqual({
        lang: 'ar',
        fromCookie: false,
      });
    });

    it('ignores unknown languages', () => {
      expect(resolveRequestLanguage(url('?lang=fr'), 'lang=de')).toEqual({
        lang: 'ar',
        fromCookie: false,
      });
    });
  });

  describe('hasRequestLanguageQuery', () => {
    it('returns true only when ?lang= is a supported UI language', () => {
      expect(hasRequestLanguageQuery(url('?lang=en'))).toBeTrue();
      expect(hasRequestLanguageQuery(url('?lang=ar'))).toBeTrue();
      expect(hasRequestLanguageQuery(url('?lang=fr'))).toBeFalse();
      expect(hasRequestLanguageQuery(url())).toBeFalse();
    });
  });

  describe('resolveBrowserLanguageWithSource', () => {
    it('reports query without reading localStorage or cookie first', () => {
      localStorage.setItem('lang', 'ar');
      expect(resolveBrowserLanguageWithSource('?lang=en')).toEqual({
        lang: 'en',
        source: 'query',
      });
    });

    it('reports storage when localStorage has a valid language', () => {
      localStorage.setItem('lang', 'en');
      expect(resolveBrowserLanguageWithSource('')).toEqual({ lang: 'en', source: 'storage' });
    });

    it('reports cookie and default appropriately', () => {
      document.cookie = 'lang=en; Path=/';
      expect(resolveBrowserLanguageWithSource('')).toEqual({ lang: 'en', source: 'cookie' });
      document.cookie = 'lang=; Path=/; Max-Age=0';
      expect(resolveBrowserLanguageWithSource('')).toEqual({ lang: 'ar', source: 'default' });
    });
  });

  describe('isPublicSsrPath', () => {
    it('matches public SSR routes with optional trailing slash', () => {
      expect(isPublicSsrPath('/gallery')).toBeTrue();
      expect(isPublicSsrPath('/gallery/')).toBeTrue();
      expect(isPublicSsrPath('/gallery/asset/42')).toBeTrue();
      expect(isPublicSsrPath('/publisher/7')).toBeTrue();
      expect(isPublicSsrPath('/reciters')).toBeTrue();
      expect(isPublicSsrPath('/reciters/alafasy')).toBeTrue();
      expect(isPublicSsrPath('/license/CC-BY')).toBeTrue();
      expect(isPublicSsrPath('/content-standards')).toBeTrue();
    });

    it('excludes non-public or unknown paths', () => {
      expect(isPublicSsrPath('/')).toBeFalse();
      expect(isPublicSsrPath('/publishers')).toBeFalse();
      expect(isPublicSsrPath('/admin')).toBeFalse();
      expect(isPublicSsrPath('/account/login')).toBeFalse();
      expect(isPublicSsrPath('/gallery/asset/42/extra')).toBeFalse();
    });
  });

  describe('resolveRequestTheme', () => {
    it('reads light and dark from theme cookie and ignores others', () => {
      expect(resolveRequestTheme('a=1; theme=dark')).toBe('dark');
      expect(resolveRequestTheme('theme=light')).toBe('light');
      expect(resolveRequestTheme('theme=sepia')).toBeNull();
      expect(resolveRequestTheme(undefined)).toBeNull();
    });
  });

  describe('readCookie', () => {
    it('finds a cookie among others', () => {
      expect(readCookie('x=1; lang=en; y=2', 'lang')).toBe('en');
    });

    it('returns null when missing or malformed', () => {
      expect(readCookie('', 'lang')).toBeNull();
      expect(readCookie('language=en', 'lang')).toBeNull();
      expect(readCookie('lang=%E0%A4%A', 'lang')).toBeNull();
    });
  });
});
