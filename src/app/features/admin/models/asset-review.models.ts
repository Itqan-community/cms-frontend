import type { AssetTemplate } from './asset-content.models';

export type ReviewState = 'unreviewed' | 'approved' | 'commented';

/** One reviewable per-commit change (an AssetVersionChange) with its review state. */
export interface ReviewChange {
  id: number;
  unit_type: AssetTemplate;
  /** Canonical id of the unit: sura id, ayah id, word id, or page number. */
  unit_id: number;
  /** Display reference, e.g. "2. Al-Baqara", "2:255", "2:255:4", "Page 42". */
  label: string;
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
