import { ISO_639_LANGUAGES, languageLabel, localizedLanguageName } from './iso-639.util';

describe('iso-639.util', () => {
  describe('ISO_639_LANGUAGES', () => {
    it('should be populated with ISO languages sorted by name', () => {
      expect(ISO_639_LANGUAGES.length).toBeGreaterThan(100);
      const ar = ISO_639_LANGUAGES.find((l) => l.code === 'ar');
      expect(ar).toBeDefined();
      expect(ar?.code).toBe('ar');
    });
  });

  describe('languageLabel', () => {
    it('should format found language with English and native names', () => {
      const label = languageLabel('ar');
      expect(label).toContain('Arabic');
      expect(label).toContain('العربية');
    });

    it('should fall back to raw code when not in list', () => {
      expect(languageLabel('xyz-unknown')).toBe('xyz-unknown');
    });
  });

  describe('localizedLanguageName', () => {
    it('should localize language into Arabic', () => {
      const name = localizedLanguageName('fr', 'ar');
      // In Arabic locale, French should localize to الفرنسية
      expect(name).toBe('الفرنسية');
    });

    it('should localize language into English', () => {
      const name = localizedLanguageName('fr', 'en');
      expect(name).toBe('French');
    });

    it('should fall back to native or code for unknown codes', () => {
      const name = localizedLanguageName('zz-bad', 'en');
      expect(name).toBe('zz-bad');
    });

    it('should return empty string when given empty code', () => {
      expect(localizedLanguageName('', 'en')).toBe('');
    });
  });
});
