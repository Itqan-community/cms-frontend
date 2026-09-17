/**
 * Recitation timestamp editing contracts.
 *
 * The audio file itself is never modified by this feature — only the millisecond
 * boundaries that say where each ayah starts and ends inside it.
 *
 * NOTE: the portal save/load contract is not confirmed yet (see `AudioTimestampsService`).
 * These shapes mirror the ayah timing JSON the existing `POST /portal/timing/upload/`
 * flow produces, which is the only timestamp format currently in the system.
 */

/** One ayah's bounds inside a surah recording. */
export interface AyahTimestamp {
  ayah: number;
  start_ms: number;
  end_ms: number;
}

/** Where the recitation itself begins and ends (excludes leading/trailing silence). */
export interface SurahBounds {
  start_ms: number;
  end_ms: number;
}

/** Everything the editor loads for a single track. */
export interface TrackTimestamps {
  track_id: number;
  surah_number: number;
  /** Null when the timing file carries ayah bounds only. */
  surah: SurahBounds | null;
  ayahs: AyahTimestamp[];
}

/** Marker levels the editor can draw. `word` is deferred to a follow-up. */
export type MarkerKind = 'surah-start' | 'surah-end' | 'ayah-start' | 'ayah-end';

/**
 * A single draggable boundary. The editor flattens `TrackTimestamps` into this list
 * so the canvas has one uniform thing to draw and hit-test, then folds it back on save.
 */
export interface EditorMarker {
  /** Stable within a session: `surah-start`, `ayah-4-start`, … */
  id: string;
  kind: MarkerKind;
  /** Null for the two surah bounds. */
  ayah: number | null;
  ms: number;
  /** Value as loaded, kept so the UI can show accumulated drift and detect dirtiness. */
  originalMs: number;
}

/** A rule violation found by `validateMarkers` — surfaced before save, never auto-fixed. */
export interface MarkerIssue {
  markerId: string;
  reason: 'out-of-range' | 'crosses-neighbour' | 'zero-length';
}
