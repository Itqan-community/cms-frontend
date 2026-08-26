import type { AssetVersionParentKind } from './asset-versions.models';

/** A per-ayah content draft version (state === 'draft'). */
export interface ContentDraftVersion {
  id: number;
  asset_id: number;
  name: string;
  summary: string;
  state: 'draft' | 'published';
  entries_count: number;
  /** True once the draft's entries have been edited after seeding. */
  has_changes: boolean;
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
  footnotes: string;
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
  footnotes: string;
}

export type { AssetVersionParentKind };
