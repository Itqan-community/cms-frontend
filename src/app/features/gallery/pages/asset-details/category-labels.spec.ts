/**
 * The asset details badge renders `'CATEGORIES.' + asset.category`, so every category the API can
 * return needs a label in each language, or the raw key shows (e.g. "CATEGORIES.mushaf").
 */
// Values of CategoryChoice in the backend (apps/content/models.py).
const API_CATEGORIES = [
  'recitation',
  'mushaf',
  'tafsir',
  'program',
  'linguistic',
  'translation',
  'font',
  'search',
  'tajweed',
];

describe('CATEGORIES translations', () => {
  for (const lang of ['ar', 'en']) {
    it(`labels every API category in ${lang}`, async () => {
      const i18n = await (await fetch(`/i18n/${lang}.json`)).json();
      const missing = API_CATEGORIES.filter((c) => !i18n.CATEGORIES?.[c]);
      expect(missing).toEqual([]);
    });
  }
});
