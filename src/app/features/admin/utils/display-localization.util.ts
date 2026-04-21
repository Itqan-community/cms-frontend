const FALLBACK_LANGUAGE_LABELS: Record<string, { ar: string; en: string }> = {
  ar: { ar: 'العربية', en: 'Arabic' },
  en: { ar: 'الإنجليزية', en: 'English' },
};

function normalizedUiLocale(lang: string | null | undefined): 'ar' | 'en' {
  return (lang ?? '').toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function localizeLanguageCode(
  code: string | null | undefined,
  uiLang: string | null | undefined
): string {
  if (!code) return '—';

  const normalized = code.toLowerCase();
  const locale = normalizedUiLocale(uiLang);
  const fallback = FALLBACK_LANGUAGE_LABELS[normalized];
  if (fallback) return fallback[locale];

  try {
    const label = new Intl.DisplayNames([locale], { type: 'language' }).of(normalized);
    return label ?? code;
  } catch {
    return code;
  }
}

export function localizeCountryCodeOrName(
  value: string | null | undefined,
  uiLang: string | null | undefined
): string {
  if (!value) return '—';

  const trimmed = value.trim();
  if (!trimmed) return '—';

  // If backend sends a full country name already, keep it.
  if (!/^[a-zA-Z]{2}$/.test(trimmed)) return trimmed;

  const locale = normalizedUiLocale(uiLang);
  const code = trimmed.toUpperCase();
  try {
    const label = new Intl.DisplayNames([locale], { type: 'region' }).of(code);
    return label ?? code;
  } catch {
    return code;
  }
}

/** Hijri year in admin tables, e.g. `1444 هـ` / `1444 AH`. */
export function formatHijriYearForAdminListing(
  year: number | null | undefined,
  opts: { suffix: string; empty: string }
): string {
  if (year == null || year === 0 || !Number.isFinite(Number(year))) {
    return opts.empty;
  }
  return `${year} ${opts.suffix}`;
}
