import type { AssetChannelFlags, AssetChannelFormFlags } from '../../utils/asset-channels.util';
import { Licenses } from '../../../../core/enums/licenses.enum';
import type { AssetTemplate } from '../../models/asset-content.models';

export type AssetSortingQuery =
  | 'id'
  | '-id'
  | 'name'
  | '-name'
  | 'publisher_id'
  | '-publisher_id'
  | 'created_at'
  | '-created_at'
  | 'updated_at'
  | '-updated_at';

export type AssetLangFilter = 'ar' | 'en';

/** What kind of text a text asset holds. `name` follows the request language. */
export interface AssetTag {
  slug: string;
  name: string;
}

/** What kind of text a text asset holds. `name` follows the request language. */
export interface AssetTag {
  slug: string;
  name: string;
}

export interface PublisherRef {
  id: number;
  name: string;
}

export interface AssetVersion {
  id: number;
  asset_id?: number;
  name: string;
  summary?: string;
  file_url: string;
  size_bytes: number;
  created_at: string;
}

/** Shape returned by the list endpoint: GET /portal/text-assets/ */
export interface TextAssetItem extends AssetChannelFlags {
  id: number;
  slug: string;
  name: string;
  description: string;
  publisher: PublisherRef;
  license: string;
  language?: string | null;
  is_external: boolean;
  is_open_access: boolean;
  /** Draft assets stay in the portal but are hidden from consumers. */
  status?: AssetStatus;
  template: AssetTemplate | null;
  tags: AssetTag[];
  mushaf_layout: { id: number; name: string; page_count: number } | null;
  created_at: string;
}

/** Shape returned by the detail endpoint: GET /portal/text-assets/{text_asset_slug}/ */
export interface TextAssetDetails extends AssetChannelFlags {
  id: number;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  long_description_ar: string;
  long_description_en: string;
  thumbnail_url: string | null;
  publisher: PublisherRef;
  license: string;
  language?: string | null;
  is_external: boolean;
  is_open_access: boolean;
  /** Draft assets stay in the portal but are hidden from consumers. */
  status?: AssetStatus;
  external_url: string | null;
  template: AssetTemplate | null;
  tags: AssetTag[];
  mushaf_layout: { id: number; name: string; page_count: number } | null;
  versions: AssetVersion[];
  created_at: string;
}

/** Paginated list response */
export interface TextAssetsList {
  results: TextAssetItem[];
  count: number;
}

/** Query parameters for the list endpoint */
export interface TextAssetFilters {
  page: number;
  page_size: number;
  search?: string;
  publisher_id?: number;
  license_code?: string;
  language?: AssetLangFilter;
  is_external?: boolean;
  is_open_access?: boolean;
  /** Tag slug, e.g. `tafsir`. */
  tag?: string;
  ordering?: AssetSortingQuery;
}

/** JSON payload for create / update */
export interface TextAssetFormValue extends AssetChannelFormFlags {
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  long_description_ar: string;
  long_description_en: string;
  license: Licenses;
  language: string;
  publisher_id: number;
  is_external: boolean;
  is_open_access: boolean;
  /** Draft assets stay in the portal but are hidden from consumers. */
  status?: AssetStatus;
  external_url?: string | null;
  thumbnail?: File;
  /** Tag slugs; the first one prefixes the package name on create. */
  tags?: string[];
  /** Create-only: fixed at creation, immutable afterwards. */
  template?: AssetTemplate;
  /** Create-only: required iff template === 'page'. */
  mushaf_layout_id?: number | null;
  /** Create-only: first version metadata (name and summary per language) + content file. */
  version_name_en?: string;
  version_name_ar?: string;
  /** Required with `file`: the first version's number ("major.minor"). */
  version_number?: string;
  version_summary_en?: string;
  version_summary_ar?: string;
  /** Create-only: package slug suggested by `POST /portal/ai/slug/`. */
  slug?: string;
  file?: File;
}

/** Publisher option returned by /portal/filters/publishers/ */
export interface PublisherFilterItem {
  id: number;
  name: string;
}

export interface PublisherFilterResponse {
  results: PublisherFilterItem[];
  count: number;
}

/** `Asset.status`: a draft is hidden from the gallery, APIs and the itqan CLI. */
export type AssetStatus = 'draft' | 'ready';
