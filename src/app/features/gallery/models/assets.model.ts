import { Categories } from '../../../core/enums/categories.enum';
import { Licenses } from '../../../core/enums/licenses.enum';

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
}

interface AssetSnapshot {
  image_url: string;
  title: string;
  description: string;
}
