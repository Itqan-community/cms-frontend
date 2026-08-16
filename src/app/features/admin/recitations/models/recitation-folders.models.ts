/** GET /portal/recitations/{slug}/folders/ — OpenAPI FolderOut (portal folders router). */
export interface RecitationFolderOut {
  id: number;
  name: string;
  name_ar: string | null;
  name_en: string | null;
  slug: string;
  is_default: boolean;
  tracks_count: number;
  created_at: string;
  updated_at: string;
}

/** Nested on GET /portal/recitations/{slug}/ — lighter FolderOut on RecitationDetailOut. */
export interface RecitationDetailFolderRef {
  id: number;
  name: string;
  slug: string;
  is_default: boolean;
}

/** POST/PATCH folder name fields — at least one non-empty name is required by the API. */
export interface RecitationFolderWriteIn {
  name_ar?: string;
  name_en?: string;
}
