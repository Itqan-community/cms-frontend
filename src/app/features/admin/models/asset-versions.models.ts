/** Portal asset version (tafsir / translation). */
export interface AssetVersion {
  id: number;
  asset_id: number;
  name: string;
  summary?: string;
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
}

/** Payload for create/update multipart requests. */
export interface AssetVersionFormPayload {
  asset_id: number;
  name: string;
  summary: string;
  file?: File | null;
}

export type AssetVersionParentKind = 'tafsir' | 'translation';
