import type {
  AyahTimestamp,
  EditorMarker,
  MarkerIssue,
  MarkerKind,
  SurahBounds,
  TrackTimestamps,
} from '../models/audio-timestamps.models';

/**
 * Pure marker rules for the timestamp editor. The waveform component reports raw pointer
 * positions; every decision about whether a move is legal happens here, so the rules stay
 * testable without a DOM.
 */

/** Two boundaries may never land closer than this — a zero-length ayah is not editable. */
export const MIN_MARKER_GAP_MS = 10;

/** Nudge steps offered by the precision controls, in the order they are rendered. */
export const NUDGE_STEPS_MS: readonly number[] = [-100, -10, 10, 100];

/** An ayah's two boundaries, either of which may be missing in malformed data. */
export interface AyahGroup {
  ayah: number;
  start?: EditorMarker;
  end?: EditorMarker;
}

type CompleteAyahGroup = AyahGroup & { start: EditorMarker; end: EditorMarker };

/** Flattens loaded timestamps into the ordered marker list the editor works on. */
export function buildMarkers(timestamps: TrackTimestamps): EditorMarker[] {
  const surahMarkers = timestamps.surah
    ? [
        marker('surah-start', 'surah-start', null, timestamps.surah.start_ms),
        marker('surah-end', 'surah-end', null, timestamps.surah.end_ms),
      ]
    : [];

  const ayahMarkers = timestamps.ayahs.flatMap((ayah) => [
    marker(`ayah-${ayah.ayah}-start`, 'ayah-start', ayah.ayah, ayah.start_ms),
    marker(`ayah-${ayah.ayah}-end`, 'ayah-end', ayah.ayah, ayah.end_ms),
  ]);

  return sortMarkers([...surahMarkers, ...ayahMarkers]);
}

/** Folds the edited marker list back into the payload shape, preserving track identity. */
export function applyMarkers(
  markers: readonly EditorMarker[],
  base: TrackTimestamps
): TrackTimestamps {
  return {
    ...base,
    surah: surahBoundsOf(markers),
    ayahs: ayahTimestampsOf(markers),
  };
}

/**
 * How far a marker may travel before it collides with its neighbours.
 * Surah bounds are excluded from the ayah chain — they wrap it rather than sit in it, so each
 * one is fenced by its own counterpart instead.
 */
export function neighbourBounds(
  markers: readonly EditorMarker[],
  markerId: string,
  durationMs: number
): { min: number; max: number } {
  const marker = markers.find((m) => m.id === markerId);
  if (marker && isSurahBound(marker.kind)) return surahBoundRange(markers, marker, durationMs);

  const chain = ayahChain(markers);
  const index = chain.findIndex((m) => m.id === markerId);

  if (index === -1) return { min: 0, max: durationMs };

  const previous = chain[index - 1];
  const next = chain[index + 1];

  return {
    min: previous ? previous.ms + MIN_MARKER_GAP_MS : 0,
    max: next ? next.ms - MIN_MARKER_GAP_MS : durationMs,
  };
}

/**
 * A surah bound is fenced by the other surah bound and by nothing else: the recitation may
 * open before the first ayah and close after the last. Without this the pair could be dragged
 * past each other into a reversed or zero-length range, which `applyMarkers` would then save.
 */
function surahBoundRange(
  markers: readonly EditorMarker[],
  marker: EditorMarker,
  durationMs: number
): { min: number; max: number } {
  const counterpart = markers.find(
    (m) => m.kind === (marker.kind === 'surah-start' ? 'surah-end' : 'surah-start')
  );

  if (!counterpart) return { min: 0, max: durationMs };

  return marker.kind === 'surah-start'
    ? { min: 0, max: counterpart.ms - MIN_MARKER_GAP_MS }
    : { min: counterpart.ms + MIN_MARKER_GAP_MS, max: durationMs };
}

/** Moves one marker to an absolute position, clamped to its neighbours and the track. */
export function moveMarker(
  markers: readonly EditorMarker[],
  markerId: string,
  ms: number,
  durationMs: number
): EditorMarker[] {
  const { min, max } = neighbourBounds(markers, markerId, durationMs);
  const clamped = Math.round(clamp(ms, min, Math.max(min, max)));

  return markers.map((m) => (m.id === markerId ? { ...m, ms: clamped } : m));
}

/** Moves one marker by a relative amount — the ±10 ms / ±100 ms precision controls. */
export function nudgeMarker(
  markers: readonly EditorMarker[],
  markerId: string,
  deltaMs: number,
  durationMs: number
): EditorMarker[] {
  const current = markers.find((m) => m.id === markerId);
  if (!current) return [...markers];

  return moveMarker(markers, markerId, current.ms + deltaMs, durationMs);
}

/** Distance a marker has travelled since it was loaded, for the drift readout. */
export function markerDrift(marker: EditorMarker): number {
  return marker.ms - marker.originalMs;
}

/** True when any marker has moved — drives the unsaved-changes guard. */
export function hasUnsavedChanges(markers: readonly EditorMarker[]): boolean {
  return markers.some((m) => m.ms !== m.originalMs);
}

/** Marker nearest to a time, used by `[` / `]` seeking and by snap-to-playhead. */
export function nearestMarker(markers: readonly EditorMarker[], ms: number): EditorMarker | null {
  return markers.reduce<EditorMarker | null>(
    (closest, m) => (!closest || Math.abs(m.ms - ms) < Math.abs(closest.ms - ms) ? m : closest),
    null
  );
}

/** The next marker strictly after `ms`, or null at the end of the track. */
export function markerAfter(markers: readonly EditorMarker[], ms: number): EditorMarker | null {
  return sortMarkers(markers).find((m) => m.ms > ms) ?? null;
}

/** The previous marker strictly before `ms`, or null at the start of the track. */
export function markerBefore(markers: readonly EditorMarker[], ms: number): EditorMarker | null {
  // `findLast` would read better but needs the ES2023 lib; the project targets ES2022.
  return (
    sortMarkers(markers)
      .filter((m) => m.ms < ms)
      .at(-1) ?? null
  );
}

/**
 * Rule violations to show before saving. Clamping in `moveMarker` prevents these for edited
 * markers, but loaded data can arrive already broken — worth telling the admin about rather
 * than silently correcting.
 */
export function validateMarkers(
  markers: readonly EditorMarker[],
  durationMs: number
): MarkerIssue[] {
  const ayahs = groupByAyah(markers);

  return [
    ...outOfRangeIssues(markers, durationMs),
    ...surahBoundsIssues(markers),
    ...ayahLengthIssues(ayahs),
    ...ayahOverlapIssues(ayahs),
  ];
}

/** Ascending by time; ties keep ayah starts before ayah ends so the chain stays coherent. */
export function sortMarkers(markers: readonly EditorMarker[]): EditorMarker[] {
  return [...markers].sort((a, b) => a.ms - b.ms || kindOrder(a.kind) - kindOrder(b.kind));
}

// --- issue detection ---

function outOfRangeIssues(markers: readonly EditorMarker[], durationMs: number): MarkerIssue[] {
  return markers
    .filter((m) => m.ms < 0 || m.ms > durationMs)
    .map((m) => issue(m.id, 'out-of-range'));
}

/**
 * The same two faults as `ayahLengthIssues`, for the surah range. Clamping guards live edits
 * only — a timing file can arrive with its bounds already reversed or collapsed.
 */
function surahBoundsIssues(markers: readonly EditorMarker[]): MarkerIssue[] {
  const start = markers.find((m) => m.kind === 'surah-start');
  const end = markers.find((m) => m.kind === 'surah-end');
  if (!start || !end) return [];

  const length = end.ms - start.ms;

  if (length < 0) return [issue(end.id, 'crosses-neighbour')];
  if (length < MIN_MARKER_GAP_MS) return [issue(end.id, 'zero-length')];
  return [];
}

function ayahLengthIssues(ayahs: readonly AyahGroup[]): MarkerIssue[] {
  return ayahs.filter(isComplete).flatMap(({ start, end }) => {
    const length = end.ms - start.ms;

    if (length < 0) return [issue(end.id, 'crosses-neighbour')];
    if (length < MIN_MARKER_GAP_MS) return [issue(end.id, 'zero-length')];
    return [];
  });
}

/**
 * Compared by ayah number rather than by time: sorting the markers would reorder an
 * overlapping pair into an apparently valid sequence and hide the fault entirely.
 */
function ayahOverlapIssues(ayahs: readonly AyahGroup[]): MarkerIssue[] {
  return ayahs.slice(1).flatMap((current, index) => {
    const previousEnd = ayahs[index].end;
    const currentStart = current.start;

    return previousEnd && currentStart && currentStart.ms < previousEnd.ms
      ? [issue(currentStart.id, 'crosses-neighbour')]
      : [];
  });
}

// --- shaping ---

function surahBoundsOf(markers: readonly EditorMarker[]): SurahBounds | null {
  const start = markers.find((m) => m.kind === 'surah-start');
  const end = markers.find((m) => m.kind === 'surah-end');

  return start && end ? { start_ms: start.ms, end_ms: end.ms } : null;
}

function ayahTimestampsOf(markers: readonly EditorMarker[]): AyahTimestamp[] {
  return groupByAyah(markers)
    .filter(isComplete)
    .map(({ ayah, start, end }) => ({ ayah, start_ms: start.ms, end_ms: end.ms }));
}

/** Ayah bounds keyed by ayah number, ascending — the order the recitation is read in. */
export function groupByAyah(markers: readonly EditorMarker[]): AyahGroup[] {
  const grouped = markers.reduce((acc, m) => {
    if (m.ayah == null) return acc;

    return acc.set(m.ayah, { ...(acc.get(m.ayah) ?? { ayah: m.ayah }), ...boundOf(m) });
  }, new Map<number, AyahGroup>());

  return [...grouped.values()].sort((a, b) => a.ayah - b.ayah);
}

function boundOf(marker: EditorMarker): Partial<AyahGroup> {
  if (marker.kind === 'ayah-start') return { start: marker };
  if (marker.kind === 'ayah-end') return { end: marker };
  return {};
}

function ayahChain(markers: readonly EditorMarker[]): EditorMarker[] {
  return sortMarkers(markers.filter((m) => m.ayah != null));
}

// --- small helpers ---

function isComplete(group: AyahGroup): group is CompleteAyahGroup {
  return !!group.start && !!group.end;
}

function issue(markerId: string, reason: MarkerIssue['reason']): MarkerIssue {
  return { markerId, reason };
}

function isSurahBound(kind: MarkerKind): boolean {
  return kind === 'surah-start' || kind === 'surah-end';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function kindOrder(kind: MarkerKind): number {
  const order: Record<MarkerKind, number> = {
    'surah-start': 0,
    'ayah-start': 1,
    'ayah-end': 2,
    'surah-end': 3,
  };

  return order[kind];
}

function marker(id: string, kind: MarkerKind, ayah: number | null, ms: number): EditorMarker {
  return { id, kind, ayah, ms, originalMs: ms };
}
