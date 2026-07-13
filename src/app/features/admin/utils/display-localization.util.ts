export interface DisplayLocalizationLabels {
  empty: string;
  languageAr: string;
  languageEn: string;
}

function normalizedUiLocale(lang: string | null | undefined): 'ar' | 'en' {
  return (lang ?? '').toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function createDisplayLocalizationLabels(translate: {
  instant(key: string): string;
}): DisplayLocalizationLabels {
  return {
    empty: translate.instant('COMMON.EM_DASH'),
    languageAr: translate.instant('COMMON.LANG_NAMES.AR'),
    languageEn: translate.instant('COMMON.LANG_NAMES.EN'),
  };
}

export function localizeLanguageCode(
  code: string | null | undefined,
  uiLang: string | null | undefined,
  labels: DisplayLocalizationLabels
): string {
  if (!code) return labels.empty;

  const normalized = code.toLowerCase();
  const locale = normalizedUiLocale(uiLang);
  if (normalized === 'ar') return labels.languageAr;
  if (normalized === 'en') return labels.languageEn;

  try {
    const label = new Intl.DisplayNames([locale], { type: 'language' }).of(normalized);
    return label ?? code;
  } catch {
    return code;
  }
}

export function localizeCountryCodeOrName(
  value: string | null | undefined,
  uiLang: string | null | undefined,
  labels: Pick<DisplayLocalizationLabels, 'empty'>
): string {
  if (!value) return labels.empty;

  const trimmed = value.trim();
  if (!trimmed) return labels.empty;

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
