import { Categories } from '../../../core/enums/categories.enum';
import { Licenses } from '../../../core/enums/licenses.enum';
import type { AssetTemplate } from '../../admin/models/asset-content.models';

export type AssetAccessStatus = 'not_requested' | 'pending' | 'approved' | 'rejected';

export interface ApiAssets {
  results: Asset[];
  count: number;
}

export interface Asset {
  id: number;
  category: Categories;
  name: string;
  description: string;
  publisher: {
    id: number;
    name: string;
  };
  license: Licenses;
  is_open_access?: boolean;
  template: AssetTemplate | null;
  mushaf_layout: { id: number; name: string; page_count: number } | null;
  /** True when a recitation has per-ayah timings in a visible folder. */
  has_ayah_timings: boolean;
}

export interface AssetDetails {
  id: number;
  category: string;
  name: string;
  description: string;
  long_description: string;
  thumbnail_url: string;
  publisher: {
    id: number;
    name: string;
    description: string;
  };
  resource: {
    id: number;
  };
  license: string;
  is_open_access?: boolean;
  access_status?: AssetAccessStatus | null;
  snapshots: AssetSnapshot[];
  /** Language codes with at least one published version (multi-language assets). */
  available_languages?: string[];
  template: AssetTemplate | null;
  mushaf_layout: { id: number; name: string; page_count: number } | null;
  /** How the itqan CLI installs the asset; null when it can't. */
  package?: AssetPackage | null;
}

export interface AssetPackage {
  slug: string;
  /** Installable languages, source first. */
  languages: { language: string; is_source: boolean }[];
}

interface AssetSnapshot {
  image_url: string;
  title: string;
  description: string;
}

/** What a translation / tafsir download looks like: its CSV layout and a few rows. */
export interface AssetFileStructure {
  format: 'csv';
  /** What one row is: surah, ayah, word or page. */
  template: AssetTemplate;
  /** The CSV header: unit columns, then one per text column. */
  header: string[];
  /** The text columns, with their display labels. */
  columns: { key: string; label_en: string; label_ar: string }[];
  /** Up to three sample rows, as in the file. */
  rows: string[][];
}
