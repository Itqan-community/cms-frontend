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

export interface CreateReciterRequest {
  identifier: string;
  name_ar: string;
  name_en: string;
  nationality: string;
  date_of_birth?: string;
  date_of_death?: string;
  about?: string;
}
