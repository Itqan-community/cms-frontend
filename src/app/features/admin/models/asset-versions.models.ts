/** Portal asset version (tafsir / translation). */
export interface AssetVersion {
  id: number;
  asset_id: number;
  /** Language code of this version (e.g. 'ar', 'fr'). */
  language?: string;
  /** True when this is the latest commit (head) for its language — what the editor builds on. */
  is_active?: boolean;
  /** True when this is the version consumers are served for its language (translations/tafsirs). */
  is_published?: boolean;
  /** True when every change in this version is approved, so it can be published. */
  is_approved?: boolean;
  /** Unapproved changes still listed on the review page (unreviewed or needing changes). */
  pending_review_count?: number;
  /** First committed version of its language: everything in it is listed as added. */
  is_first?: boolean;
  /** Translations/tafsirs: the version number ("major.minor"), issued by the server and
   *  never editable. Other kinds: a free-text version name. */
  name: string;
  /** Translations/tafsirs: the human-readable version name. */
  label?: string;
  summary?: string;
  /** Commit author (version creator) display name. */
  created_by?: string | null;
  /** Per-type change tallies for this commit (null for legacy/pre-feature versions). */
  change_counts?: { added: number; modified: number; removed: number } | null;
  /** Changes in this version a reviewer left a comment on (translations/tafsirs). */
  review_comments_count?: number;
  file_url: string;
  size_bytes: number;
  created_at: string;
}

export interface AssetVersionsListResponse {
  results: AssetVersion[];
  count: number;
}

export interface AssetVersionsListParams {
  page: number;
  page_size: number;
  search?: string;
  /** Filter to a single language's versions (translations/tafsirs). */
  language?: string;
}

/** How the next tafsir/translation version number is derived from the latest one. */
export type VersionBump = 'minor' | 'major';

/** Payload for create/update multipart requests. */
export interface AssetVersionFormPayload {
  asset_id: number;
  /** Free-text version name (mushafs, fonts, programs). */
  name?: string;
  /** Translations/tafsirs: version name. */
  label?: string;
  /** Translations/tafsirs, create only: starts the language's number sequence. */
  version_number?: string;
  /** Translations/tafsirs, create only: how the next number is derived. */
  bump?: VersionBump;
  summary: string;
  file?: File | null;
  /** Language this uploaded version belongs to (translations/tafsirs). */
  language?: string | null;
}

export type AssetVersionParentKind = 'tafsir' | 'translation' | 'mushaf' | 'font' | 'program';
