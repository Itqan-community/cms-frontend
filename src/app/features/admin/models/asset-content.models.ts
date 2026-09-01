import type { AssetVersionParentKind } from './asset-versions.models';
import type { ContentTemplate, MushafPrint } from './content-template.models';
import type { ContentVersionState } from './content-review.models';

/** A per-ayah content draft version. */
export interface ContentDraftVersion {
  id: number;
  asset_id: number;
  name: string;
  summary: string;
  state: ContentVersionState;
  entries_count: number;
  created_at: string;
}

/** Optional content-template fields on tafsir/translation assets (write-once at creation). */
export interface AssetContentTemplateFields {
  template?: ContentTemplate | null;
  mushaf_print?: MushafPrint | null;
  default_language?: string | null;
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
