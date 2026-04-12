import { PublisherRef } from '../../tafsirs/models/tafsirs.models';

export enum MaddLevel {
  TWASSUT = 'twassut',
  QASR = 'qasr',
}

export enum MeemBehavior {
  SILAH = 'silah',
  SKOUN = 'skoun',
}

export interface MinimalReciter {
  id: number;
  name: string;
}

export interface MinimalQiraah {
  id: number;
  name: string;
  bio: string;
}

export interface MinimalRiwayah {
  id: number;
  name: string;
  bio: string;
  qiraah_id?: number;
}

/** GET /portal/recitations/ row */
export interface RecitationListItem {
  id: number;
  slug?: string;
  name: string;
  description: string;
  publisher: PublisherRef;
  license: string;
  created_at: string;
  reciter: MinimalReciter;
  qiraah: MinimalQiraah;
  riwayah: MinimalRiwayah | null;
  madd_level: MaddLevel;
  meem_behaviour: MeemBehavior;
  year: number;
}

export interface RecitationDetails {
  id: number;
  slug?: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  publisher: PublisherRef & { description?: string };
  reciter: MinimalReciter;
  qiraah: MinimalQiraah;
  riwayah: MinimalRiwayah | null;
  madd_level: MaddLevel;
  meem_behaviour: MeemBehavior;
  year: number;
  license: string;
  created_at: string;
  updated_at: string;
}

export interface RecitationFormValue {
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  publisher_id: number;
  reciter_id: number;
  qiraah_id: number;
  riwayah_id: number | null;
  madd_level: MaddLevel | null;
  meem_behaviour: MeemBehavior | null;
  year: number | null;
  license: string;
}

export interface RecitationsListResponse {
  results: RecitationListItem[];
  count: number;
}

export type RecitationSorting =
  | 'name'
  | '-name'
  | 'reciter_name'
  | '-reciter_name'
  | 'qiraah_name'
  | '-qiraah_name'
  | 'riwayah_name'
  | '-riwayah_name'
  | 'madd_level'
  | '-madd_level'
  | 'meem_behaviour'
  | '-meem_behaviour'
  | 'year'
  | '-year'
  | 'license'
  | '-license'
  | 'created_at'
  | '-created_at'
  | 'updated_at'
  | '-updated_at';

export interface RecitationListFilters {
  page: number;
  page_size: number;
  search?: string;
  publisher_id?: number;
  reciter_id?: number;
  qiraah_id?: number;
  riwayah_id?: number;
  madd_level?: MaddLevel;
  meem_behaviour?: MeemBehavior;
  year?: number;
  license_code?: string;
  ordering?: RecitationSorting;
}

export interface NamedId {
  id: number;
  name: string;
}
