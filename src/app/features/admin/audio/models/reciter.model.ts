export interface Reciter {
  id: number;
  name: string;
  bio: string;
  recitations_count: number;
}

export interface ReciterCreate {
  id: string;
  name: string;
  name_en?: string;
  nationality?: string;
  birth_year?: number;
  death_year?: number;
  photo_url?: string;
  bio?: string;
}

export interface RecitersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Reciter[];
}

export interface RecitersStats {
  total_reciters: number;
  total_contemporary: number;
  total_nationalities: number;
  isMock?: boolean;
}
