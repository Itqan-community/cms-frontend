const GENERIC_BACKEND_MESSAGES = new Set(
  ['server error', 'error', 'bad request', 'internal server error'].map((s) => s.toLowerCase())
);

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF]/;

/** Whether backend text matches the active UI language (Arabic script for `ar`, Latin for `en`). */
export function isMessageLocalizedForUi(message: string, uiLang: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || GENERIC_BACKEND_MESSAGES.has(trimmed.toLowerCase())) {
    return false;
  }
  const hasArabic = ARABIC_SCRIPT_RE.test(trimmed);
  const lang = (uiLang || 'ar').toLowerCase().split('-')[0];
  if (lang === 'ar') {
    return hasArabic;
  }
  if (lang === 'en') {
    return !hasArabic;
  }
  return true;
}
