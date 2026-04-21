/**
 * POST /portal/timing/upload/
 * multipart/form-data: asset_id (integer), files[] (binary, repeated)
 * Response: OpenAPI `TimingUploadOut`
 */
export interface RecitationTimingUploadOut {
  asset_id: number;
  created_total: number;
  updated_total: number;
  skipped_total: number;
  missing_tracks: number[];
  file_errors: string[];
  synced_file_url: string | null;
  synced_filename: string;
}

/** `upload_failed` error body `extra` — see OpenAPI `ResultDict`. */
export interface TimingUploadResultDict {
  created_total: number;
  updated_total: number;
  skipped_total: number;
  missing_tracks: number[];
  file_errors: string[];
}
