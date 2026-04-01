export interface ApiRecitations {
  count: number;
  next: string | null;
  previous: string | null;
  results: Recitation[];
}

export interface RecitationStats {
  totalRiwayas: number;
  totalReciters: number;
  totalRecitations: number;
}

export interface Recitation {
  id: number;
  name: string;
  description?: string;
  publisher?: {
    id: number;
    name: string;
  };
  reciter: {
    id: number;
    name: string;
  };
  riwayah: {
    id: number;
    name: string;
  } | null;
  qiraah: {
    id: number;
    name: string;
  };
  surahs_count: number;
  performance?: string;
  style?: string;
  recitation_type?: string;
  audio_quality?: string[];
}

export interface RecitationFilter {
  searchQuery?: string;
  riwayah?: string;
  recitationType?: string;
  page?: number;
}
