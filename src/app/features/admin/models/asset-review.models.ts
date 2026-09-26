export type ReviewState = 'unreviewed' | 'approved' | 'commented';

/** One reviewable per-commit change (an AssetVersionChange) with its review state. */
export interface ReviewChange {
  id: number;
  sura: number;
  aya: number;
  surah_name: string;
  change_type: 'added' | 'modified' | 'removed';
  old_text: string;
  new_text: string;
  /** The last-approved text for this ayah (the review baseline); empty if never approved. */
  baseline_text: string;
  commit_ref: string;
  commit_id: number;
  review_state: ReviewState;
  comment: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface ReviewChangesResponse {
  results: ReviewChange[];
  count: number;
}
