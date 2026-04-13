/**
 * Portal recitation tracks upload/delete API contracts.
 * @see .temp/CMS Portal - Bulk Upload Recitations - Implementation Plan.md
 */

export type RecitationTrackValidateFileStatus = 'valid' | 'skip' | 'invalid';

export type RecitationTrackValidateUploadStatus = 'valid' | 'invalid';

/** POST /portal/recitation-tracks/validate-upload/ */
export interface RecitationTrackValidateUploadIn {
  asset_id: number;
  filenames: string[];
}

export interface RecitationTrackValidateFileOut {
  filename: string;
  status: RecitationTrackValidateFileStatus;
}

export interface RecitationTrackValidateUploadOut {
  asset_id: number;
  status: RecitationTrackValidateUploadStatus;
  message: string;
  files: RecitationTrackValidateFileOut[];
}

/** DELETE /portal/recitation-tracks/ */
export interface RecitationTrackDeleteTracksIn {
  asset_id: number;
  track_ids: number[];
}

/** POST /portal/recitation-tracks/uploads/start/ */
export interface RecitationTrackUploadStartIn {
  asset_id: number;
  filename: string;
  duration_ms?: number | null;
  size_bytes?: number | null;
}

export interface RecitationTrackUploadStartOut {
  key: string;
  upload_id: string;
  content_type: string;
  surah_number: number;
}

/** POST /portal/recitation-tracks/uploads/sign-part/ */
export interface RecitationTrackUploadSignPartIn {
  key: string;
  upload_id: string;
  part_number: number;
}

export interface RecitationTrackUploadSignPartOut {
  url: string;
}

/** Multipart finish parts — ETags as returned by R2 */
export interface RecitationTrackUploadFinishPart {
  ETag: string;
  PartNumber: number;
}

/** POST /portal/recitation-tracks/uploads/finish/ */
export interface RecitationTrackUploadFinishIn {
  asset_id: number;
  filename: string;
  key: string;
  upload_id: string;
  parts: RecitationTrackUploadFinishPart[];
  duration_ms?: number | null;
  size_bytes?: number | null;
}

export interface RecitationTrackUploadFinishOut {
  track_id: number;
  asset_id: number;
  surah_number: number;
  size_bytes: number;
  finished_at: string;
  key: string;
}

/** POST /portal/recitation-tracks/uploads/abort/ */
export interface RecitationTrackUploadAbortIn {
  key: string;
  upload_id: string;
}

export interface RecitationTrackUploadAbortOut {
  key: string;
  upload_id: string;
  aborted: boolean;
}

// --- UI / orchestration ---

export type RecitationTrackRowPhase =
  | 'idle'
  | 'pending_validation'
  | 'skipped_validation'
  | 'invalid_validation'
  | 'ready'
  | 'queued'
  | 'uploading'
  | 'success'
  | 'failed';

export interface RecitationTrackUploadRowState {
  file: File;
  filename: string;
  validateStatus?: RecitationTrackValidateFileStatus;
  phase: RecitationTrackRowPhase;
  /** 0–1 overall progress for this file */
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  errorMessage?: string;
  surahNumber?: number;
  trackId?: number;
}

/** GET /portal/recitation-tracks/ — single row (portal list). */
export interface RecitationTrackPortalListApiRow {
  id: number;
  asset_id?: number;
  surah_number: number;
  surah_name?: string | null;
  duration_ms?: number | null;
  size_bytes?: number | null;
  finished_at?: string | null;
  audio_url?: string | null;
}

export interface RecitationTracksListApiResponse {
  results: RecitationTrackPortalListApiRow[];
  count: number;
}

/** Normalized row for the admin tracks table + audio preview. */
export interface RecitationSurahTrackListItem {
  id: number;
  asset_id: number;
  surah_number: number;
  surah_name?: string;
  duration_ms?: number | null;
  size_bytes?: number | null;
  audio_url: string;
  finished_at?: string;
}
