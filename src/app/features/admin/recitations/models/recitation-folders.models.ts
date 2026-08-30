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
  /**
   * Whether the folder is served publicly. Optional because the portal API does not
   * return it yet; absent is read as visible, matching the current backend behaviour
   * where every folder is public. Gated by `environment.recitationFolderVisibility`.
   */
  is_visible?: boolean;
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
  /** Only sent once the API accepts it; see `is_visible` on `RecitationFolderOut`. */
  is_visible?: boolean;
  /** Only true is sent when promoting a folder to the public default. */
  is_default?: boolean;
}

/**
 * Audio quality axis of a folder variant. Values double as the English name fragment,
 * so `128kbps` yields the `128kbps` folder name and the `128kbps` slug.
 *
 * `ORIGINAL` means "the quality the publisher uploaded", which the auto-created default
 * folder implicitly holds — it is offered only in combination with effects.
 */
export enum RecitationFolderQuality {
  ORIGINAL = 'original',
  KBPS_64 = '64kbps',
  KBPS_128 = '128kbps',
  KBPS_192 = '192kbps',
  KBPS_320 = '320kbps',
}

/**
 * A folder's identity: the same recitation re-rendered at a given quality, with or
 * without added sound effects. The folder name is derived from this pair, never typed.
 */
export interface RecitationFolderVariant {
  quality: RecitationFolderQuality;
  hasFx: boolean;
}
