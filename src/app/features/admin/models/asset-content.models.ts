import type { VersionText } from '../utils/version-text.util';
import type { AssetVersionParentKind } from './asset-versions.models';

/** One language an asset provides content in (source + translations). */
export interface AssetLanguage {
  language: string;
  is_source: boolean;
  /** Whether this language is available to consumers (READY). Translations start
   *  pending (false) until explicitly marked available. */
  is_available: boolean;
}

/** One text column of a translation / tafsir. `key` is the CSV header and is the
 *  same in every language; the labels are display names only. */
export interface AssetColumn {
  key: string;
  label_en: string;
  label_ar: string;
  order: number;
  /** A committed version contains it: its key is frozen and it can't be deleted. */
  committed: boolean;
}

/** A per-ayah content draft version (state === 'draft'). Carries its version
 *  name and summary per language (see VersionText). */
export interface ContentDraftVersion extends VersionText {
  id: number;
  asset_id: number;
  /** Language code this draft belongs to. */
  language: string;
  /** Version number ("major.minor"); empty while a draft. */
  name: string;
  state: 'draft' | 'published';
  entries_count: number;
  created_at: string;
  /** Text column keys in file order (a draft follows the asset's current columns). */
  column_keys: string[];
  /** Columns were reordered since the last version: committing must be major. */
  requires_major: boolean;
  /** The asset's unit template; absent from older backends. */
  template?: AssetTemplate | null;
}

/** Content granularity of a text asset. Fixed when the asset is created. */
export type AssetTemplate = 'surah' | 'ayah' | 'word' | 'page' | 'ayah_group' | 'word_group';

/** Templates whose rows each cover a publisher-chosen range of ayahs / words (tafsir only). */
export const GROUP_TEMPLATES: readonly AssetTemplate[] = ['ayah_group', 'word_group'];

export function isGroupTemplate(template: AssetTemplate | null | undefined): boolean {
  return !!template && GROUP_TEMPLATES.includes(template);
}

/** A position in the mushaf: an ayah, or a word of it when `word` is set (1-based). */
export interface QuranPosition {
  surah: number;
  ayah: number;
  word?: number | null;
}

/** One ayah (or word) of a range preview, in mushaf order. */
export interface QuranRangeUnit {
  surah: number;
  ayah: number;
  word: number | null;
  text: string;
}

export interface QuranRangeResponse {
  units: QuranRangeUnit[];
  /** The range is longer than the preview returns. */
  truncated: boolean;
}

export interface MushafLayout {
  id: number;
  name: string;
  page_count: number;
  assets_count: number;
}

/** One editable content row returned by the entries endpoint. */
export interface ContentEntry {
  unit_type: AssetTemplate;
  /** Canonical id of the unit: sura id, ayah id, word id, or page number (an opaque
   *  key for a group). */
  unit_id: number;
  /** Identifying reference, e.g. "1. Al-Fatiha", "2:255", "2:255:4", "Page 42". */
  label: string;
  /** The Quranic text being annotated; empty for the page template. */
  reference_text: string;
  sura: number | null;
  aya: number | null;
  /** Every text column's cell, keyed by column key. */
  cells: Record<string, string>;
  /** The first column (older single-column shape). */
  text: string;
  /** Source-language cells for the same unit (translations only; read-only). */
  source_cells?: Record<string, string> | null;
  /** Source-language first column (translations only; read-only). */
  source_text?: string | null;
  order: number;
  /** Draft text differs from the latest published version (drafts only). */
  changed?: boolean;
  /** The columns whose cells differ (absent from older backends: then the whole row). */
  changed_columns?: string[];
  /** Group templates: the range's ends. */
  group_from?: QuranPosition | null;
  group_to?: QuranPosition | null;
  /** Group templates, translated language: text for a range the source no longer has. */
  orphaned?: boolean;
}

/** Paginated entries response (Django Ninja pagination shape). */
export interface ContentEntriesResponse {
  results: ContentEntry[];
  count: number;
}

/** A single dirty row sent to the PATCH entries endpoint. */
export interface ContentEntryPatch {
  unit_id: number;
  /** The text column the cell belongs to. */
  column: string;
  text: string;
}

/** One changed unit in a commit diff (or a pending/uncommitted diff). */
export interface ContentChange {
  unit_type: AssetTemplate;
  unit_id: number;
  label: string;
  /** The text column of the changed cell. */
  column: string;
  change_type: 'added' | 'modified' | 'removed';
  old_text: string;
  new_text: string;
  /** A reviewer's outcome (committed versions only; absent on pending diffs). */
  review_state?: 'unreviewed' | 'approved' | 'commented';
  review_comment?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

export type { AssetVersionParentKind };
