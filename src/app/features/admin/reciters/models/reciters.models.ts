import { NATIONALITY } from '../nationality.enum';

export type ReciterSorting =
  | 'name'
  | '-name'
  | 'recitations_count'
  | '-recitations_count'
  | 'created_at'
  | '-created_at'
  | 'updated_at'
  | '-updated_at';

/** GET /portal/reciters/ row */
export interface ReciterListItem {
  id: number;
  name: string;
  bio: string;
  recitations_count: number;
  nationality: string;
  slug: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  date_of_death: string;
}

/** GET /portal/reciters/:id/ */
export interface ReciterDetails {
  id: number;
  name_ar: string;
  name_en: string;
  bio_ar: string;
  bio_en: string;
  recitations_count: number;
  slug: string;
  image_url: string;
  nationality?: string;
  created_at: string;
  updated_at: string;
  date_of_death: string;
}

export interface ReciterFormValue {
  name_ar: string;
  name_en: string;
  bio_ar: string;
  bio_en: string;
  nationality: string;
  image_url: string;
  date_of_death: string;
}

export interface RecitersListResponse {
  results: ReciterListItem[];
  count: number;
}

export interface ReciterListFilters {
  page: number;
  page_size: number;
  search?: string;
  nationality?: NATIONALITY;
  ordering?: ReciterSorting;
}
