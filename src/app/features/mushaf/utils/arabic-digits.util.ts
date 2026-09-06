const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Convert a non-negative integer to its Arabic-Indic digit representation
 * (e.g. 12 -> "١٢"), used for ayah-number markers.
 */
export function toArabicDigits(value: number): string {
  return String(value)
    .split('')
    .map((char) => (char >= '0' && char <= '9' ? ARABIC_INDIC_DIGITS[Number(char)] : char))
    .join('');
}
