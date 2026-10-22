/** Anything carrying a text column's key and its display labels. */
export interface LabelledColumn {
  key: string;
  label_en: string;
  label_ar: string;
}

/** A column's display name in the UI language, falling back to the other label, then the key. */
export function columnLabel(column: LabelledColumn, lang: string): string {
  const [first, second] =
    lang === 'ar' ? [column.label_ar, column.label_en] : [column.label_en, column.label_ar];
  return first || second || column.key;
}
