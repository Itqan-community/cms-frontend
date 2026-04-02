import { Licenses } from '../../../../core/enums/licenses.enum';

export type AssetSortingQuery =
  | 'id'
  | '-id'
  | 'name'
  | '-name'
  | 'publisher_id'
  | '-publisher_id';

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

/** Shape returned by the list endpoint: GET /portal/tafsirs/ */
export interface TafsirItem {
  id: number;
  name: string;
  description: string;
  publisher: PublisherRef;
  license: string;
  created_at: string;
}

/** Shape returned by the detail endpoint: GET /portal/tafsirs/:id/ */
export interface TafsirDetails {
  id: number;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  long_description_ar: string;
  long_description_en: string;
  thumbnail_url: string | null;
  publisher: PublisherRef & { description: string };
  license: string;
  language: AssetLangFilter;
  versions: AssetVersion[];
  created_at: string;
}

/** Paginated list response */
export interface TafsirsList {
  results: TafsirItem[];
  count: number;
}

/** Query parameters for the list endpoint */
export interface TafsirFilters {
  page: number;
  page_size: number;
  search?: string;
  publisher_id?: number;
  license_code?: string;
  language?: AssetLangFilter;
  is_external?: boolean;
  ordering?: AssetSortingQuery;
}

/** Payload for create / update */
export interface TafsirFormValue {
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  long_description_ar: string;
  long_description_en: string;
  license: Licenses;
  language: AssetLangFilter;
  publisher_id: number;
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
