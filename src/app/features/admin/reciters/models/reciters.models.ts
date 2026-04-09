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
  nationality: string | null;
  slug: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  date_of_death: string | null;
}

/** GET /portal/reciters/{reciter_slug}/ */
export interface ReciterDetails {
  id: number;
  name_ar: string;
  name_en: string;
  bio_ar: string;
  bio_en: string;
  recitations_count: number;
  slug: string;
  image_url: string | null;
  nationality?: string | null;
  created_at: string;
  updated_at: string;
  date_of_death: string | null;
}

export interface ReciterFormValue {
  name_ar: string;
  name_en: string;
  bio_ar: string;
  bio_en: string;
  nationality?: string | null;
  date_of_death?: string | null;
}

export interface RecitersListResponse {
  results: ReciterListItem[];
  count: number;
}

export interface ReciterListFilters {
  page: number;
  page_size: number;
  search?: string;
  name_ar?: string;
  name_en?: string;
  bio_ar?: string;
  bio_en?: string;
  ordering?: ReciterSorting;
}
