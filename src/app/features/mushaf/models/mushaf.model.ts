/**
 * Mushaf data models. The SVG reader uses the quranpedia quran-svg dataset
 * (MushafEdition / MushafSurahMeta / AyahMarker) fetched from the jsDelivr CDN.
 * The Sura/Ayah/Word types mirror the backend `/cms-api/suras/*` schema
 * (itqan-cms-backend/apps/quran) and are retained for reference.
 */

export interface Sura {
  id: number;
  name: string;
  transliterated_name: string;
  english_name: string;
  ayas_count: number;
  start_offset: number;
  revelation_type: string;
  revelation_order: number;
  rukus_count: number;
}

export interface Word {
  id: number;
  position_in_ayah: number;
  text: string;
}

export interface Ayah {
  id: number;
  sura_id: number;
  number_in_sura: number;
  text: string;
  juz: number;
  hizb_quarter: number;
  page: number;
  words: Word[];
}

/** Paginated list envelope returned by the backend NinjaPagination. */
export interface PaginatedSuras {
  results: Sura[];
  count: number;
}

/**
 * A mushaf edition (qiraa + publisher) available from the quranpedia quran-svg
 * dataset, served via jsDelivr CDN.
 */
export interface MushafEdition {
  /** URL-safe identifier, e.g. "hafs-kfqc". */
  slug: string;
  /** Qiraa folder, e.g. "hafs". */
  qiraa: string;
  /** Publisher folder, e.g. "kfqc". */
  publisher: string;
  nameAr: string;
  nameEn: string;
  isDefault?: boolean;
}

/** One marker from a mushaf edition's `markers.json` (ayah = global index). */
export interface AyahMarker {
  page: number;
  ayah: number;
  x: number;
  y: number;
}

/** One surah entry from a mushaf edition's `surah.json`. */
export interface MushafSurahMeta {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTranslation: string;
  ayahCount: number;
  juzNumber: number;
  /** Mushaf page on which this surah starts. */
  pageNumber: number;
  headerPosition: number;
}
