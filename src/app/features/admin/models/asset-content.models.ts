import type { AssetVersionParentKind } from './asset-versions.models';

/** One language an asset provides content in (source + translations). */
export interface AssetLanguage {
  language: string;
  is_source: boolean;
  /** Whether this language is available to consumers (READY). Translations start
   *  pending (false) until explicitly marked available. */
  is_available: boolean;
}

/** A per-ayah content draft version (state === 'draft'). */
export interface ContentDraftVersion {
  id: number;
  asset_id: number;
  /** Language code this draft belongs to. */
  language: string;
  name: string;
  summary: string;
  state: 'draft' | 'published';
  entries_count: number;
  created_at: string;
}

/** Content granularity of a text asset. Fixed when the asset is created. */
export type AssetTemplate = 'surah' | 'ayah' | 'word' | 'page';

export interface MushafLayout {
  id: number;
  name: string;
  page_count: number;
  assets_count: number;
}

/** One editable content row returned by the entries endpoint. */
export interface ContentEntry {
  unit_type: AssetTemplate;
  /** Canonical id of the unit: sura id, ayah id, word id, or page number. */
  unit_id: number;
  /** Identifying reference, e.g. "1. Al-Fatiha", "2:255", "2:255:4", "Page 42". */
  label: string;
  /** The Quranic text being annotated; empty for the page template. */
  reference_text: string;
  sura: number | null;
  aya: number | null;
  text: string;
  /** Source-language text for the same unit (translations only; read-only). */
  source_text?: string | null;
  order: number;
}

/** Paginated entries response (Django Ninja pagination shape). */
export interface ContentEntriesResponse {
  results: ContentEntry[];
  count: number;
}

/** A single dirty row sent to the PATCH entries endpoint. */
export interface ContentEntryPatch {
  unit_id: number;
  text: string;
}

/** One changed unit in a commit diff (or a pending/uncommitted diff). */
export interface ContentChange {
  unit_type: AssetTemplate;
  unit_id: number;
  label: string;
  change_type: 'added' | 'modified' | 'removed';
  old_text: string;
  new_text: string;
}

export type { AssetVersionParentKind };
