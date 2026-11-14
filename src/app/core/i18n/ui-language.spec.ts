import { readCookie, resolveRequestLanguage } from './ui-language';

describe('ui-language', () => {
  const url = (query = '') => new URL(`https://cms.itqan.dev/gallery${query}`);

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
