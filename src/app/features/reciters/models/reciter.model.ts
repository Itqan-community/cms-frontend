/** GET /cms-api/reciters/ row */
export interface Reciter {
  id: number;
  name: string;
  slug: string;
  bio: string;
  recitations_count: number;
  nationality: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /cms-api/reciters/{slug}/ */
export interface ReciterDetail {
  id: number;
  name_ar: string;
  name_en: string;
  bio_ar: string;
  bio_en: string;
  recitations_count: number;
  nationality: string | null;
  slug: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  date_of_death: string | null;
}

export interface ApiReciters {
  results: Reciter[];
  count: number;
}
