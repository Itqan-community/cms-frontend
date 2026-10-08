/** A translation/tafsir version's name (label) and summary, in English and Arabic. */
export interface VersionText {
  label_en: string;
  label_ar: string;
  summary_en: string;
  summary_ar: string;
}

export const EMPTY_VERSION_TEXT: VersionText = {
  label_en: '',
  label_ar: '',
  summary_en: '',
  summary_ar: '',
};

/** The same text with each field whitespace-trimmed. */
export function trimVersionText(text: VersionText): VersionText {
  return {
    label_en: text.label_en.trim(),
    label_ar: text.label_ar.trim(),
    summary_en: text.summary_en.trim(),
    summary_ar: text.summary_ar.trim(),
  };
}

/** A summary is required in at least one language. */
export function hasVersionSummary(text: Pick<VersionText, 'summary_en' | 'summary_ar'>): boolean {
  return !!(text.summary_en.trim() || text.summary_ar.trim());
}

/** The name or summary in the UI language, falling back to the other language. */
export function localizedVersionText(
  source: Partial<VersionText> | null | undefined,
  field: 'label' | 'summary',
  uiLang: string | undefined
): string {
  const [first, second] = uiLang === 'ar' ? (['ar', 'en'] as const) : (['en', 'ar'] as const);
  return source?.[`${field}_${first}`] || source?.[`${field}_${second}`] || '';
}
