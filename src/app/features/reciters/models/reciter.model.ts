export interface Reciter {
  id: number;
  identifier: string;
  name_ar: string;
  name_en: string;
  nationality: string;
  date_of_birth: string;
  date_of_death: string;
  about: string;
}

export interface ApiReciters {
  results: Reciter[];
  count: number;
}

export interface RecitersStats {
  total_reciters: number;
  total_nationalities: number;
  contemporary_reciters: number;
}

export interface CreateReciterRequest {
  identifier: string;
  name_ar: string;
  name_en: string;
  nationality: string;
  date_of_birth?: string;
  date_of_death?: string;
  about?: string;
}
