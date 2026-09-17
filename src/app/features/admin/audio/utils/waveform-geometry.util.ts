import type { EditorMarker } from '../models/audio-timestamps.models';

/**
 * Coordinate maths for the waveform: time ↔ pixels, hit-testing, and zooming.
 *
 * Pure by design — no DOM, no Angular, no canvas. The component owns pixels and events;
 * every decision about *where* something is lives here, where it can be tested with numbers.
 *
 * The x axis always runs earlier → later, left → right, regardless of page direction. A
 * waveform mirrored for RTL would put the end of the recitation on the left, which is not a
 * layout preference but a misreading of the audio.
 */

/** The slice of the track currently on screen. */
export interface WaveformView {
  startMs: number;
  endMs: number;
}

/** Smallest window the editor will zoom to — 200 ms across the full width. */
export const MIN_VIEW_MS = 200;

/** How close a pointer must be to a marker to grab it. */
export const MARKER_HIT_TOLERANCE_PX = 8;

/** Horizontal position of a timestamp, in CSS pixels from the left edge. */
export function msToX(ms: number, view: WaveformView, width: number): number {
  const span = view.endMs - view.startMs;
  if (span <= 0 || width <= 0) return 0;

  return ((ms - view.startMs) / span) * width;
}

/** The timestamp under a horizontal position, in milliseconds. */
export function xToMs(x: number, view: WaveformView, width: number): number {
  if (width <= 0) return view.startMs;

  return view.startMs + (x / width) * (view.endMs - view.startMs);
}

/** Keeps a view inside the track and no narrower than {@link MIN_VIEW_MS}. */
export function clampView(view: WaveformView, durationMs: number): WaveformView {
  const track = Math.max(durationMs, MIN_VIEW_MS);
  const span = Math.min(Math.max(view.endMs - view.startMs, MIN_VIEW_MS), track);
  const startMs = Math.min(Math.max(view.startMs, 0), track - span);

  return { startMs, endMs: startMs + span };
}

/**
 * Zooms around a fixed timestamp, so the audio under the pointer stays under the pointer.
 * `factor` below 1 zooms in.
 */
export function zoomView(
  view: WaveformView,
  durationMs: number,
  factor: number,
  anchorMs: number
): WaveformView {
  const span = view.endMs - view.startMs;
  if (span <= 0) return clampView(view, durationMs);

  const anchorRatio = (anchorMs - view.startMs) / span;
  const nextSpan = span * factor;
  const startMs = anchorMs - anchorRatio * nextSpan;

  return clampView({ startMs, endMs: startMs + nextSpan }, durationMs);
}

/** Scrolls the view by a number of milliseconds, staying inside the track. */
export function panView(view: WaveformView, durationMs: number, deltaMs: number): WaveformView {
  return clampView({ startMs: view.startMs + deltaMs, endMs: view.endMs + deltaMs }, durationMs);
}

/** Moves the view so a timestamp is visible, keeping the current zoom level. */
export function viewAround(view: WaveformView, durationMs: number, ms: number): WaveformView {
  const span = view.endMs - view.startMs;

  return clampView({ startMs: ms - span / 2, endMs: ms + span / 2 }, durationMs);
}

/** Only what the renderer needs to draw — markers outside the window cost nothing. */
export function visibleMarkers(
  markers: readonly EditorMarker[],
  view: WaveformView
): EditorMarker[] {
  return markers.filter((m) => m.ms >= view.startMs && m.ms <= view.endMs);
}

/**
 * The marker a pointer is grabbing, or null. Ties break toward the closest marker so
 * overlapping boundaries stay individually selectable at low zoom.
 */
export function markerAtX(
  markers: readonly EditorMarker[],
  x: number,
  view: WaveformView,
  width: number,
  tolerancePx = MARKER_HIT_TOLERANCE_PX
): EditorMarker | null {
  const candidates = visibleMarkers(markers, view)
    .map((marker) => ({ marker, distance: Math.abs(msToX(marker.ms, view, width) - x) }))
    .filter(({ distance }) => distance <= tolerancePx);

  if (candidates.length === 0) return null;

  return candidates.reduce((closest, current) =>
    current.distance < closest.distance ? current : closest
  ).marker;
}
