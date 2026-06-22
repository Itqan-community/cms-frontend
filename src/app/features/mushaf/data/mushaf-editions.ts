import { MushafEdition } from '../models/mushaf.model';

/**
 * The mushaf editions available from the quranpedia quran-svg dataset
 * (served via jsDelivr CDN). Folder paths map to
 * `mushafs/{qiraa}/{publisher}` in the source repo.
 */
export const MUSHAF_EDITIONS: MushafEdition[] = [
  {
    slug: 'hafs-kfqc',
    qiraa: 'hafs',
    publisher: 'kfqc',
    nameAr: 'حفص عن عاصم',
    nameEn: 'Hafs ʿan ʿAsim',
    isDefault: true,
  },
  {
    slug: 'warsh-kfqc',
    qiraa: 'warsh',
    publisher: 'kfqc',
    nameAr: 'ورش عن نافع',
    nameEn: 'Warsh ʿan Nafiʿ',
  },
  {
    slug: 'qalon-kfqc',
    qiraa: 'qalon',
    publisher: 'kfqc',
    nameAr: 'قالون عن نافع',
    nameEn: 'Qalun ʿan Nafiʿ',
  },
  {
    slug: 'qalon-libya-awqaf',
    qiraa: 'qalon',
    publisher: 'libya-awqaf',
    nameAr: 'قالون عن نافع (أوقاف ليبيا)',
    nameEn: 'Qalun ʿan Nafiʿ (Libyan Awqaf)',
  },
  {
    slug: 'douri-kfqc',
    qiraa: 'douri',
    publisher: 'kfqc',
    nameAr: 'الدوري عن أبي عمرو',
    nameEn: 'Al-Duri ʿan Abi ʿAmr',
  },
  {
    slug: 'shubah-kfqc',
    qiraa: 'shubah',
    publisher: 'kfqc',
    nameAr: 'شعبة عن عاصم',
    nameEn: 'Shuʿbah ʿan ʿAsim',
  },
];

export const DEFAULT_MUSHAF_EDITION =
  MUSHAF_EDITIONS.find((e) => e.isDefault) ?? MUSHAF_EDITIONS[0];

export function findMushafEdition(slug: string | null | undefined): MushafEdition | undefined {
  if (!slug) return undefined;
  return MUSHAF_EDITIONS.find((e) => e.slug === slug);
}
