export interface RecitationsStats {
  total_riwayas: number;
  total_reciters: number;
  total_recitations: number;
}

export interface Recitation {
  id: number;
  reciter_id: number;
  reciter_name_ar: string;
  reciter_name_en: string;
  riwayah: string;
  recitation_type: string;
  recitation_style: string;
  total_surahs: number;
  audio_qualities: string[];
}

export interface ApiRecitations {
  results: Recitation[];
  count: number;
}
