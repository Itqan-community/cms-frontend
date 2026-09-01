/** Extended version states once the review workflow API ships. */
export type ContentVersionState = 'draft' | 'ready_for_review' | 'changes_requested' | 'published';

export interface ContentRowComment {
  id: number;
  version_id: number;
  row_key: string;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
}

export interface ContentRowApproval {
  row_key: string;
  approved_by_id: number;
  approved_by_name: string;
  approved_at: string;
}

export interface ContentDiffEntryOut {
  row_key: string;
  sura: number;
  aya: number;
  surah_name: string;
  before_text: string;
  after_text: string;
  before_footnotes: string;
  after_footnotes: string;
  approved: boolean;
  comments_count: number;
}

export interface ContentDiffResponse {
  version_id: number;
  base_version_id: number;
  state: ContentVersionState;
  results: ContentDiffEntryOut[];
  count: number;
}
