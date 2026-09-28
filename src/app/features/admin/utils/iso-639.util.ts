/** Language options for the "add language" picker.
 *
 * Languages are stored as free-form codes across the app. This module provides
 * the complete ISO 639-1 set (every two-letter code) with English + native names
 * derived from the browser's `Intl.DisplayNames`, so the picker is exhaustive
 * without hand-maintaining ~180 names. */
export interface IsoLanguage {
  code: string;
  /** English name. */
  name: string;
  /** Native (endonym) name. */
  native: string;
}

/** Every ISO 639-1 (two-letter) language code. */
const ISO_639_1_CODES: readonly string[] = [
  'aa',
  'ab',
  'ae',
  'af',
  'ak',
  'am',
  'an',
  'ar',
  'as',
  'av',
  'ay',
  'az',
  'ba',
  'be',
  'bg',
  'bh',
  'bi',
  'bm',
  'bn',
  'bo',
  'br',
  'bs',
  'ca',
  'ce',
  'ch',
  'co',
  'cr',
  'cs',
  'cu',
  'cv',
  'cy',
  'da',
  'de',
  'dv',
  'dz',
  'ee',
  'el',
  'en',
  'eo',
  'es',
  'et',
  'eu',
  'fa',
  'ff',
  'fi',
  'fj',
  'fo',
  'fr',
  'fy',
  'ga',
  'gd',
  'gl',
  'gn',
  'gu',
  'gv',
  'ha',
  'he',
  'hi',
  'ho',
  'hr',
  'ht',
  'hu',
  'hy',
  'hz',
  'ia',
  'id',
  'ie',
  'ig',
  'ii',
  'ik',
  'io',
  'is',
  'it',
  'iu',
  'ja',
  'jv',
  'ka',
  'kg',
  'ki',
  'kj',
  'kk',
  'kl',
  'km',
  'kn',
  'ko',
  'kr',
  'ks',
  'ku',
  'kv',
  'kw',
  'ky',
  'la',
  'lb',
  'lg',
  'li',
  'ln',
  'lo',
  'lt',
  'lu',
  'lv',
  'mg',
  'mh',
  'mi',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'na',
  'nb',
  'nd',
  'ne',
  'ng',
  'nl',
  'nn',
  'no',
  'nr',
  'nv',
  'ny',
  'oc',
  'oj',
  'om',
  'or',
  'os',
  'pa',
  'pi',
  'pl',
  'ps',
  'pt',
  'qu',
  'rm',
  'rn',
  'ro',
  'ru',
  'rw',
  'sa',
  'sc',
  'sd',
  'se',
  'sg',
  'si',
  'sk',
  'sl',
  'sm',
  'sn',
  'so',
  'sq',
  'sr',
  'ss',
  'st',
  'su',
  'sv',
  'sw',
  'ta',
  'te',
  'tg',
  'th',
  'ti',
  'tk',
  'tl',
  'tn',
  'to',
  'tr',
  'ts',
  'tt',
  'tw',
  'ty',
  'ug',
  'uk',
  'ur',
  'uz',
  've',
  'vi',
  'vo',
  'wa',
  'wo',
  'xh',
  'yi',
  'yo',
  'za',
  'zh',
  'zu',
];

const displayNamesCache = new Map<string, Intl.DisplayNames | null>();

function displayNames(
  locale: string,
  fallback: 'code' | 'none' = 'code'
): Intl.DisplayNames | null {
  const cacheKey = `${locale}:${fallback}`;
  if (displayNamesCache.has(cacheKey)) {
    return displayNamesCache.get(cacheKey) ?? null;
  }
  try {
    const instance = new Intl.DisplayNames([locale], { type: 'language', fallback });
    displayNamesCache.set(cacheKey, instance);
    return instance;
  } catch {
    displayNamesCache.set(cacheKey, null);
    return null;
  }
}

/** Codes outside ISO 639-1 that the picker offered before the list was derived
 *  from `Intl.DisplayNames`. Kept so existing options never disappear; the
 *  curated names are the fallback when the platform has no name for the code. */
const SUPPLEMENTAL_LANGUAGES: readonly IsoLanguage[] = [
  { code: 'fil', name: 'Filipino', native: 'Filipino' },
];

function buildLanguages(): IsoLanguage[] {
  // `fallback: 'none'` returns undefined when the platform has no name for a
  // code, so we can drop codes that would otherwise show as bare codes.
  const en = displayNames('en', 'none');
  const languages: IsoLanguage[] = [];
  for (const code of ISO_639_1_CODES) {
    const name = en ? en.of(code) : code;
    if (!name) continue; // no real name → skip
    const native = displayNames(code)?.of(code) ?? name;
    languages.push({ code, name, native: native || name });
  }
  for (const fallback of SUPPLEMENTAL_LANGUAGES) {
    if (languages.some((l) => l.code === fallback.code)) continue;
    const name = (en ? en.of(fallback.code) : null) || fallback.name;
    const native = displayNames(fallback.code)?.of(fallback.code) || fallback.native;
    languages.push({ code: fallback.code, name, native });
  }
  return languages.sort((a, b) => a.name.localeCompare(b.name));
}

/** Complete ISO 639-1 language list, sorted by English name. */
export const ISO_639_LANGUAGES: readonly IsoLanguage[] = buildLanguages();

/** Human-readable label for a language code (falls back to the raw code). */
export function languageLabel(code: string): string {
  const found = ISO_639_LANGUAGES.find((l) => l.code === code);
  return found ? `${found.name} — ${found.native}` : code;
}

/**
 * Language name localized to the given UI language, e.g. `('fr', 'ar')` →
 * "الفرنسية", `('fr', 'en')` → "French". Uses the browser's Intl data, falling
 * back to the curated native name, then the raw code.
 */
export function localizedLanguageName(code: string, uiLang: string): string {
  if (!code) return code;
  const dn = displayNames(uiLang, 'code');
  if (dn) {
    try {
      const name = dn.of(code);
      if (name && name.toLowerCase() !== code.toLowerCase()) return name;
    } catch {
      // Intl.DisplayNames unhandled or bad code — fall through to the curated list.
    }
  }
  const found = ISO_639_LANGUAGES.find((l) => l.code === code);
  return found ? found.native : code;
}
