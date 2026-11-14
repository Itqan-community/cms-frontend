/** Matches portal API `StatusChoice`. */
export type IssueReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export interface IssueReportReporter {
  id: number;
  email: string;
}

/**
 * Where in the asset the issue is; which keys apply depends on the asset category
 * (see {@link issueContextKind}). Null on description-only and older reports.
 */
export interface IssueReportContext {
  surah?: number;
  ayah?: number;
  page?: number;
  glyph?: string;
}

export interface IssueReportOut {
  id: number;
  reporter: IssueReportReporter;
  asset_id: number;
  asset_name: string;
  asset_category: string | null;
  description: string;
  context: IssueReportContext | null;
  /** The backend's wording of `context` in the request language; empty when none. */
  context_label: string;
  status: IssueReportStatus;
  created_at: string;
  updated_at: string;
}

export interface PagedIssueReportOut {
  results: IssueReportOut[];
  count: number;
}

export interface IssueReportCreateIn {
  asset_id: number;
  description: string;
  context?: IssueReportContext | null;
}

export interface IssueReportUpdateIn {
  description?: string | null;
  status?: IssueReportStatus | null;
  /** Omit to keep the report's context; null clears it. */
  context?: IssueReportContext | null;
}

/** Filters persisted in URL query (see {@link IssuesListComponent}). */
export interface IssueReportUrlFilters {
  status?: string;
  reporter_id?: string | number;
}

export interface IssueReportListFilters {
  page: number;
  page_size: number;
  ordering?: string | null;
  status?: IssueReportStatus[];
  reporter_id?: number | null;
}
