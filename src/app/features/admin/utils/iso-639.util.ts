/** A small, curated ISO-639-1 language list for the "add language" picker.
 *
 * Languages are stored as free-form codes across the app, so this list only
 * drives the picker UI; it is not exhaustive. `native` helps translators find
 * their language quickly regardless of the UI language. */
export interface IsoLanguage {
  code: string;
  /** English name. */
  name: string;
  /** Native (endonym) name. */
  native: string;
}

export const ISO_639_LANGUAGES: readonly IsoLanguage[] = [
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'ha', name: 'Hausa', native: 'Hausa' },
  { code: 'so', name: 'Somali', native: 'Soomaali' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'uz', name: 'Uzbek', native: "O'zbek" },
  { code: 'ps', name: 'Pashto', native: 'پښتو' },
  { code: 'ku', name: 'Kurdish', native: 'Kurdî' },
  { code: 'az', name: 'Azerbaijani', native: 'Azərbaycan' },
  { code: 'bs', name: 'Bosnian', native: 'Bosanski' },
  { code: 'sq', name: 'Albanian', native: 'Shqip' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'fil', name: 'Filipino', native: 'Filipino' },
  { code: 'my', name: 'Burmese', native: 'မြန်မာ' },
] as const;

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
  try {
    const name = new Intl.DisplayNames([uiLang], { type: 'language' }).of(code);
    if (name && name.toLowerCase() !== code.toLowerCase()) return name;
  } catch {
    // Intl.DisplayNames unavailable or bad code — fall through to the curated list.
  }
  const found = ISO_639_LANGUAGES.find((l) => l.code === code);
  return found ? found.native : code;
}
