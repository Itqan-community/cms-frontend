import {
  RecitationFolderQuality,
  type RecitationFolderOut,
  type RecitationFolderVariant,
  type RecitationFolderWriteIn,
} from '../models/recitation-folders.models';

/** Quality options in the order the picker offers them. */
export const FOLDER_QUALITY_ORDER: readonly RecitationFolderQuality[] = [
  RecitationFolderQuality.ORIGINAL,
  RecitationFolderQuality.KBPS_64,
  RecitationFolderQuality.KBPS_128,
  RecitationFolderQuality.KBPS_192,
  RecitationFolderQuality.KBPS_320,
];

/** Arabic name fragment per quality; English reuses the enum value verbatim. */
const QUALITY_NAME_AR: Record<RecitationFolderQuality, string> = {
  [RecitationFolderQuality.ORIGINAL]: 'الأصلية',
  [RecitationFolderQuality.KBPS_64]: '64 كيلوبت',
  [RecitationFolderQuality.KBPS_128]: '128 كيلوبت',
  [RecitationFolderQuality.KBPS_192]: '192 كيلوبت',
  [RecitationFolderQuality.KBPS_320]: '320 كيلوبت',
};

const FX_SUFFIX_AR = 'بالمؤثرات';
const FX_SUFFIX_EN = 'with effects';

/**
 * The folder name to show for the active UI language.
 *
 * The API always populates `name`, but `name_ar` / `name_en` may be blank when the
 * folder was created with only one of them, so each language falls back to the other
 * before the unlocalized column.
 */
export function folderDisplayName(
  folder: Pick<RecitationFolderOut, 'name' | 'name_ar' | 'name_en'>,
  lang: string | undefined
): string {
  if (lang === 'en') {
    return (folder.name_en || folder.name_ar || folder.name).trim();
  }
  return (folder.name_ar || folder.name_en || folder.name).trim();
}

/**
 * The bilingual folder name a variant produces — the only place folder names are minted.
 *
 * The backend slugifies `name_en`, so `320kbps with effects` becomes the stable public
 * `?folder=320kbps-with-effects` value.
 */
export function formatFolderVariantNames(
  variant: RecitationFolderVariant
): Required<Pick<RecitationFolderWriteIn, 'name_ar' | 'name_en'>> {
  const { quality, hasFx } = variant;

  if (quality === RecitationFolderQuality.ORIGINAL) {
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
 * The variant a folder represents, or `null` when its name is not one this app minted.
 *
 * Matching is done by regenerating every combination and comparing, rather than by
 * pattern-matching the name: a folder is only ever claimed to be a known variant when
 * its name is exactly what `formatFolderVariantNames` would have produced. Free-text
 * folders created before this taxonomy (or through the API directly) stay `null` and are
 * shown as-is.
 */
export function parseFolderVariant(
  folder: Pick<RecitationFolderOut, 'name' | 'name_ar' | 'name_en'>
): RecitationFolderVariant | null {
  const candidates = [folder.name_ar, folder.name_en, folder.name]
    .map((value) => normalize(value))
    .filter((value): value is string => !!value);
  if (!candidates.length) return null;

  for (const variant of allFolderVariants()) {
    const names = formatFolderVariantNames(variant);
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
export function folderVariantKey(variant: RecitationFolderVariant): string {
  return `${variant.quality}|${variant.hasFx ? 'fx' : 'pure'}`;
}

/**
 * Variants already present on a recitation, so the picker can refuse duplicates.
 *
 * The default folder counts as `ORIGINAL` without effects even though its name is not
 * derived from the taxonomy: it *is* the untouched upload, and letting someone add a
 * second folder meaning the same thing is what this set exists to prevent.
 */
export function takenFolderVariantKeys(
  folders: readonly RecitationFolderOut[],
  excludeFolderSlug?: string
): Set<string> {
  const taken = new Set<string>();
  for (const folder of folders) {
    if (excludeFolderSlug && folder.slug === excludeFolderSlug) continue;
    if (folder.is_default) {
      taken.add(folderVariantKey({ quality: RecitationFolderQuality.ORIGINAL, hasFx: false }));
      continue;
    }
    const variant = parseFolderVariant(folder);
    if (variant) taken.add(folderVariantKey(variant));
  }
  return taken;
}

/**
 * Whether this folder's variant may still be chosen or changed.
 *
 * The default folder is exempt: it keeps the name the backend gave it. An unclassified
 * folder can always be classified, since that only replaces a free-text name. A folder
 * already holding audio is locked, because its slug was minted from its current name and
 * is the public `?folder=` identifier — renaming it would leave that slug pointing at
 * audio it no longer describes.
 */
export function canEditFolderVariant(folder: RecitationFolderOut): boolean {
  if (folder.is_default) return false;
  if (parseFolderVariant(folder) === null) return true;
  return folder.tracks_count === 0;
}

/** A folder is public unless the API says otherwise; see `is_visible` on the model. */
export function isFolderVisible(folder: Pick<RecitationFolderOut, 'is_visible'>): boolean {
  return folder.is_visible !== false;
}

/**
 * Whether this folder may be hidden from the public API.
 *
 * The default folder is excluded: the public endpoints fall back to it when no `?folder=`
 * is given, so hiding it would blank out every consumer that does not name a folder.
 */
export function canToggleFolderVisibility(folder: RecitationFolderOut): boolean {
  return !folder.is_default;
}

function allFolderVariants(): RecitationFolderVariant[] {
  return FOLDER_QUALITY_ORDER.flatMap((quality) => [
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
