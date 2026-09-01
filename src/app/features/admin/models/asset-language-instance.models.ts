import type { AssetVersionParentKind } from './asset-versions.models';

/** GET /portal/content/{kind}/{slug}/languages/ — language instance (folder analogue). */
export interface AssetLanguageInstance {
  id: number;
  language_code: string;
  name: string;
  slug: string;
  is_default: boolean;
  /** Absent means visible; mirrors recitation folder `is_visible`. */
  is_visible?: boolean;
  entries_count: number;
  created_at: string;
  updated_at: string;
}

export interface AssetLanguageInstanceWriteIn {
  language_code: string;
  name?: string;
  is_visible?: boolean;
  is_default?: boolean;
}

export type AssetContentLanguageKind = Extract<AssetVersionParentKind, 'tafsir' | 'translation'>;
