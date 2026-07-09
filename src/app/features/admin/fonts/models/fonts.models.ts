import { Licenses } from '../../../../core/enums/licenses.enum';

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

/** GET /portal/fonts/ */
export interface FontItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  publisher: PublisherRef;
  license: string;
  language?: string | null;
  is_external: boolean;
  is_open_access: boolean;
  restricted_for_tenant: boolean;
  created_at: string;
}

/** GET /portal/fonts/{font_slug}/ */
export interface FontDetails {
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
  restricted_for_tenant: boolean;
  external_url: string | null;
  versions: AssetVersion[];
  created_at: string;
}

export interface FontsList {
  results: FontItem[];
  count: number;
}

export interface FontFilters {
  page: number;
  page_size: number;
  search?: string;
  publisher_id?: number;
  license_code?: string;
  language?: AssetLangFilter;
  is_external?: boolean;
  is_open_access?: boolean;
  ordering?: AssetSortingQuery;
}

export interface FontFormValue {
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
  restricted_for_tenant: boolean;
  external_url?: string | null;
  thumbnail?: File;
}
