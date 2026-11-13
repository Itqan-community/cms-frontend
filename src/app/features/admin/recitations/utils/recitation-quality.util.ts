import {
  RecitationQualityBitrate,
  type RecitationQualityOut,
  type RecitationQualityVariant,
  type RecitationQualityWriteIn,
} from '../models/recitation-qualities.models';

/** Quality options in the order the picker offers them. */
export const QUALITY_BITRATE_ORDER: readonly RecitationQualityBitrate[] = [
  RecitationQualityBitrate.ORIGINAL,
  RecitationQualityBitrate.KBPS_64,
  RecitationQualityBitrate.KBPS_128,
  RecitationQualityBitrate.KBPS_192,
  RecitationQualityBitrate.KBPS_320,
];

/** Arabic name fragment per quality; English reuses the enum value verbatim. */
const QUALITY_NAME_AR: Record<RecitationQualityBitrate, string> = {
  [RecitationQualityBitrate.ORIGINAL]: 'الأصلية',
  [RecitationQualityBitrate.KBPS_64]: '64 كيلوبت',
  [RecitationQualityBitrate.KBPS_128]: '128 كيلوبت',
  [RecitationQualityBitrate.KBPS_192]: '192 كيلوبت',
  [RecitationQualityBitrate.KBPS_320]: '320 كيلوبت',
};

const FX_SUFFIX_AR = 'بالمؤثرات';
const FX_SUFFIX_EN = 'with effects';

/**
 * The quality name to show for the active UI language.
 *
 * The API always populates `name`, but `name_ar` / `name_en` may be blank when the
 * quality was created with only one of them, so each language falls back to the other
 * before the unlocalized column.
 */
export function qualityDisplayName(
  quality: Pick<RecitationQualityOut, 'name' | 'name_ar' | 'name_en'>,
  lang: string | undefined
): string {
  if (lang === 'en') {
    return (quality.name_en || quality.name_ar || quality.name).trim();
  }
  return (quality.name_ar || quality.name_en || quality.name).trim();
}

/**
 * The bilingual quality name a variant produces — the only place quality names are minted.
 *
 * The backend slugifies `name_en`, so `320kbps with effects` becomes the stable public
 * `?quality=320kbps-with-effects` value.
 */
export function formatQualityVariantNames(
  variant: RecitationQualityVariant
): Required<Pick<RecitationQualityWriteIn, 'name_ar' | 'name_en'>> {
  const { quality, hasFx } = variant;

  if (quality === RecitationQualityBitrate.ORIGINAL) {
    return hasFx
      ? { name_ar: FX_SUFFIX_AR, name_en: capitalize(FX_SUFFIX_EN) }
      : { name_ar: QUALITY_NAME_AR[quality], name_en: 'Original' };
  }

  return {
    name_ar: hasFx ? `${QUALITY_NAME_AR[quality]} ${FX_SUFFIX_AR}` : QUALITY_NAME_AR[quality],
    name_en: hasFx ? `${quality} ${FX_SUFFIX_EN}` : quality,
  };
}

/**
 * The variant a quality represents, or `null` when its name is not one this app minted.
 *
 * Matching is done by regenerating every combination and comparing, rather than by
 * pattern-matching the name: a quality is only ever claimed to be a known variant when
 * its name is exactly what `formatQualityVariantNames` would have produced. Free-text
 * qualities created before this taxonomy (or through the API directly) stay `null` and are
 * shown as-is.
 */
export function parseQualityVariant(
  quality: Pick<RecitationQualityOut, 'name' | 'name_ar' | 'name_en'>
): RecitationQualityVariant | null {
  const candidates = [quality.name_ar, quality.name_en, quality.name]
    .map((value) => normalize(value))
    .filter((value): value is string => !!value);
  if (!candidates.length) return null;

  for (const variant of allQualityVariants()) {
    const names = formatQualityVariantNames(variant);
    if (
      candidates.includes(normalize(names.name_ar)!) ||
      candidates.includes(normalize(names.name_en)!)
    ) {
      return variant;
    }
  }
  return null;
}

/** Stable identity for a variant, used to compare and to index the taken set. */
export function qualityVariantKey(variant: RecitationQualityVariant): string {
  return `${variant.quality}|${variant.hasFx ? 'fx' : 'pure'}`;
}

/**
 * Variants already present on a recitation, so the picker can refuse duplicates.
 *
 * The default quality reserves its classified variant when parseable; otherwise it reserves
 * `ORIGINAL` without effects. Non-default qualities contribute only when their names parse.
 */
export function takenQualityVariantKeys(
  qualities: readonly RecitationQualityOut[],
  excludeQualitySlug?: string
): Set<string> {
  const taken = new Set<string>();
  for (const quality of qualities) {
    if (excludeQualitySlug && quality.slug === excludeQualitySlug) continue;
    if (quality.is_default) {
      const variant = parseQualityVariant(quality);
      taken.add(
        qualityVariantKey(variant ?? { quality: RecitationQualityBitrate.ORIGINAL, hasFx: false })
      );
      continue;
    }
    const variant = parseQualityVariant(quality);
    if (variant) taken.add(qualityVariantKey(variant));
  }
  return taken;
}

/**
 * Whether this quality's variant may still be chosen or changed.
 *
 * Always allowed: PATCH only updates display names; quality slugs are set at creation
 * and stay fixed, so reclassifying does not break existing ?quality= links.
 */
export function canEditQualityVariant(quality: RecitationQualityOut): boolean {
  return Boolean(quality.slug);
}

/** A quality is public unless the API says otherwise; see `is_visible` on the model. */
export function isQualityVisible(quality: Pick<RecitationQualityOut, 'is_visible'>): boolean {
  return quality.is_visible !== false;
}

/**
 * Whether this quality may be hidden from the public API.
 *
 * The default quality is excluded: the public endpoints fall back to it when no `?quality=`
 * is given, so hiding it would blank out every consumer that does not name a quality.
 */
export function canToggleQualityVisibility(quality: RecitationQualityOut): boolean {
  return !quality.is_default;
}

/** Whether this visible non-default quality may be promoted to the public default. */
export function canSetQualityAsDefault(
  quality: Pick<RecitationQualityOut, 'is_default' | 'is_visible'>
): boolean {
  return !quality.is_default && isQualityVisible(quality);
}

function allQualityVariants(): RecitationQualityVariant[] {
  return QUALITY_BITRATE_ORDER.flatMap((quality) => [
    { quality, hasFx: false },
    { quality, hasFx: true },
  ]);
}

function normalize(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim().toLowerCase();
  return trimmed || null;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
