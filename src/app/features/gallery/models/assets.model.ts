import { Categories } from '../../../core/enums/categories.enum';
import { Licenses } from '../../../core/enums/licenses.enum';

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
  snapshots: AssetSnapshot[];
}

interface AssetSnapshot {
  image_url: string;
  title: string;
  description: string;
}
