/** GET /portal/recitations/{slug}/qualities/ — OpenAPI QualityOut (portal qualities router). */
export interface RecitationQualityOut {
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
   * Whether the quality is served publicly. Optional because the portal API does not
   * return it yet; absent is read as visible, matching the current backend behaviour
   * where every quality is public. Gated by `environment.recitationQualityVisibility`.
   */
  is_visible?: boolean;
}

/** Nested on GET /portal/recitations/{slug}/ — lighter QualityOut on RecitationDetailOut. */
export interface RecitationDetailQualityRef {
  id: number;
  name: string;
  slug: string;
  is_default: boolean;
}

/** POST/PATCH quality name fields — at least one non-empty name is required by the API. */
export interface RecitationQualityWriteIn {
  name_ar?: string;
  name_en?: string;
  /** Only sent once the API accepts it; see `is_visible` on `RecitationQualityOut`. */
  is_visible?: boolean;
  /** Only true is sent when promoting a quality to the public default. */
  is_default?: boolean;
}

/**
 * Audio quality axis of a quality variant. Values double as the English name fragment,
 * so `128kbps` yields the `128kbps` quality name and the `128kbps` slug.
 *
 * `ORIGINAL` means "the quality the publisher uploaded", which the auto-created default
 * quality implicitly holds — it is offered only in combination with effects.
 */
export enum RecitationQualityBitrate {
  ORIGINAL = 'original',
  KBPS_64 = '64kbps',
  KBPS_128 = '128kbps',
  KBPS_192 = '192kbps',
  KBPS_320 = '320kbps',
}

/**
 * A quality's identity: the same recitation re-rendered at a given quality, with or
 * without added sound effects. The quality name is derived from this pair, never typed.
 */
export interface RecitationQualityVariant {
  quality: RecitationQualityBitrate;
  hasFx: boolean;
}
