/**
 * Quran dataset hierarchy (Surah > Ayah > Word > Letter).
 *
 * Expected portal contract, served under `${ADMIN_API_BASE_URL}/hierarchy/`. The backend does
 * not expose it yet, so `HierarchyService` answers from `HierarchyMockStore` while
 * `environment.useHierarchyMockApi` is on. Every list endpoint uses the portal `{ results, count }`
 * envelope and returns one whole level, so the UI only asks for a level when its parent is opened.
 */

export type HierarchyLevel = 'surah' | 'ayah' | 'word' | 'letter';

export type HierarchyRevelationType = 'meccan' | 'medinan';

/** Envelope shared by every hierarchy list endpoint. */
export interface HierarchyList<T> {
  results: T[];
  count: number;
}

/** GET /portal/hierarchy/surahs/ */
export interface HierarchySurah {
  surah_number: number;
  name_ar: string;
  name_en: string;
  revelation_type: HierarchyRevelationType;
  ayahs_count: number;
}

/** GET /portal/hierarchy/surahs/{surah_number}/ayahs/ */
export interface HierarchyAyah {
  /** `{surah}:{ayah}`, e.g. `2:255`. */
  ayah_key: string;
  surah_number: number;
  ayah_number: number;
  text: string;
  words_count: number;
}

/** GET /portal/hierarchy/ayahs/{ayah_key}/words/ */
export interface HierarchyWord {
  /** `{surah}:{ayah}:{position}`, e.g. `2:255:3`. */
  word_key: string;
  ayah_key: string;
  position: number;
  text: string;
  letters_count: number;
  /** Word segment start inside the ayah audio, when the dataset has word timings. */
  start_ms?: number | null;
  /** Word segment end inside the ayah audio, when the dataset has word timings. */
  end_ms?: number | null;
}

/** GET /portal/hierarchy/words/{word_key}/letters/ */
export interface HierarchyLetter {
  /** `{surah}:{ayah}:{word}:{position}`, e.g. `2:255:3:1`. */
  letter_key: string;
  word_key: string;
  position: number;
  /** The base letter followed by its diacritics. */
  text: string;
}

export type HierarchySearchLevel = Extract<HierarchyLevel, 'surah' | 'ayah'>;

/** GET /portal/hierarchy/search/?q= (surah number or name, ayah key such as `2:255`, ayah text) */
export interface HierarchySearchResult {
  level: HierarchySearchLevel;
  surah_number: number;
  surah_name_ar: string;
  surah_name_en: string;
  /** Set for ayah hits only. */
  ayah_key: string | null;
  ayah_number: number | null;
  text: string | null;
}

/** One loaded entity, tagged with its level so the tree can render and navigate it. */
export type HierarchyNode =
  | { level: 'surah'; key: string; parentKey: null; data: HierarchySurah }
  | { level: 'ayah'; key: string; parentKey: string; data: HierarchyAyah }
  | { level: 'word'; key: string; parentKey: string; data: HierarchyWord }
  | { level: 'letter'; key: string; parentKey: string; data: HierarchyLetter };

/** A visible line of the flattened tree: an entity, or the state of a branch being opened. */
export type HierarchyRow =
  | {
      kind: 'node';
      id: string;
      node: HierarchyNode;
      depth: number;
      posInSet: number;
      setSize: number;
      expandable: boolean;
      expanded: boolean;
    }
  | { kind: 'loading' | 'empty' | 'error'; id: string; parentKey: string; depth: number };

export type HierarchyNodeRow = Extract<HierarchyRow, { kind: 'node' }>;
