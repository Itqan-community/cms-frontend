/** Matches portal API `StatusChoice`. */
export type IssueReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export interface IssueReportReporter {
  id: number;
  email: string;
}

export interface IssueReportOut {
  id: number;
  reporter: IssueReportReporter;
  asset_id: number;
  asset_name: string;
  description: string;
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
}

export interface IssueReportUpdateIn {
  description?: string | null;
  status?: IssueReportStatus | null;
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
