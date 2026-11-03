import type { AssetTemplate } from './asset-content.models';

export type ReviewState = 'unreviewed' | 'approved' | 'commented';

/** One reviewable per-commit change (an AssetVersionChange) with its review state. */
export interface ReviewChange {
  id: number;
  unit_type: AssetTemplate;
  /** Canonical id of the unit: surah id, ayah id, word id, or page number. */
  unit_id: number;
  /** Display reference, e.g. "2. Al-Baqara", "2:255", "2:255:4", "Page 42". */
  label: string;
  /** The unit's surah and ayah-in-surah numbers (a range by its start); null for a page. */
  surah: number | null;
  ayah: number | null;
  /** The text column of the changed cell, with its display labels. */
  column: string;
  column_label_en: string;
  column_label_ar: string;
  change_type: 'added' | 'modified' | 'removed';
  old_text: string;
  new_text: string;
  /** The last-approved text for this unit (the review baseline); empty if never approved. */
  baseline_text: string;
  commit_ref: string;
  commit_id: number;
  /** Author of the commit that made this change; null when not recorded. */
  edited_by: string | null;
  review_state: ReviewState;
  comment: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface ReviewChangesResponse {
  results: ReviewChange[];
  count: number;
}

/** A committed version, as offered by the review page's version filter. */
export interface ReviewVersion {
  id: number;
  name: string;
  created_at: string;
}

/** The review grid's AG Grid filter model, sent to the backend as-is. Keys are the
 *  grid's column ids: `unit_surah`, `ayah`, `text`, `change_type`, `column`,
 *  `commit_ref`, `edited_by`, `reviewed_by`, `comment`. */
export type ReviewFilterModel = Record<string, unknown>;

/** Bulk approve: the given changes, or — without `change_ids` — every change
 *  matching the state/version/column filters across all pages. */
export interface BulkApproveRequest {
  language: string;
  change_ids?: number[];
  state?: Exclude<ReviewState, 'approved'>;
  version?: number;
  filters?: ReviewFilterModel;
}

export interface BulkApproveResponse {
  /** How many changes were approved (already-approved ones are skipped). */
  approved: number;
}
