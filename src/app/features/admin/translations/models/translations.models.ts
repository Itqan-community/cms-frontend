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
  name: string;
  file_url: string;
  size_bytes: number;
  created_at: string;
}

/** GET /portal/translations/ */
export interface TranslationItem {
  id: number;
  slug?: string;
  name: string;
  description: string;
  publisher: PublisherRef;
  license: string;
  language?: string | null;
  is_external: boolean;
  created_at: string;
}

/** GET /portal/translations/{translation_slug}/ */
export interface TranslationDetails {
  id: number;
  slug?: string;
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
  external_url: string | null;
  versions: AssetVersion[];
  created_at: string;
}

export interface TranslationsList {
  results: TranslationItem[];
  count: number;
}

export interface TranslationFilters {
  page: number;
  page_size: number;
  search?: string;
  publisher_id?: number;
  license_code?: string;
  language?: AssetLangFilter;
  is_external?: boolean;
  ordering?: AssetSortingQuery;
}

/** JSON payload for create / update */
export interface TranslationFormValue {
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
  external_url?: string | null;
}

export interface PublisherFilterItem {
  id: number;
  name: string;
}

export interface PublisherFilterResponse {
  results: PublisherFilterItem[];
  count: number;
}
