import type { AssetVersionParentKind } from './asset-versions.models';

/** One language an asset provides content in (source + translations). */
export interface AssetLanguage {
  language: string;
  is_source: boolean;
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

/** One editable per-ayah row returned by the entries endpoint. */
export interface ContentEntry {
  id: number;
  ayah_id: number;
  sura: number;
  aya: number;
  surah_name: string;
  uthmani: string;
  text: string;
  /** Source-language text for the same ayah (translations only; read-only reference). */
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
  ayah_id: number;
  text: string;
}

export type { AssetVersionParentKind };
