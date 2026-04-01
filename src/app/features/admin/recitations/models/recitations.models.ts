export interface RecitationPublisherOut {
  id: number;
  name: string;
  logoUrl?: string;
}

export interface RecitationReciterOut {
  id: string;
  name: string;
  name_en?: string;
  en_name?: string;
  nameEn?: string;
  photo_url?: string;
}

export interface RecitationRiwayahOut {
  id: number;
  name: string;
}

export interface RecitationQiraahOut {
  id: number;
  name: string;
}

export interface RecitationItem {
  id: number;
  name: string;
  description: string;
  publisher: RecitationPublisherOut;
  reciter: RecitationReciterOut;
  riwayah: RecitationRiwayahOut | null;
  qiraah: RecitationQiraahOut | null;
  surahs_count: number;
  // added format/recitation style for mockup UI display
  style?: string; // مرتل / مجود
}

export interface RecitationsResponse {
  total: number;
  page: number;
  size: number;
  results: RecitationItem[];
}
