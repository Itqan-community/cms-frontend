/**
 * Mushaf reference data models — mirror the backend `/cms-api/suras/*` schema
 * (itqan-cms-backend/apps/quran).
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
