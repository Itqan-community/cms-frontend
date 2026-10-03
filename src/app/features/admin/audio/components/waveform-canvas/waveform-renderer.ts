import type { EditorMarker } from '../../models/audio-timestamps.models';
import { msToX, visibleMarkers, type WaveformView } from '../../utils/waveform-geometry.util';
import { groupByAyah } from '../../utils/timestamp-markers.util';
import { peaksForWindow, type WaveformPeaks } from '../../utils/waveform-peaks.util';

/**
 * Turns a scene into pixels. Framework-free on purpose: it takes a 2D context and plain data,
 * so it can be driven by any component and tested with a stub context.
 *
 * It resolves no colours of its own — the caller passes a theme read from CSS custom
 * properties, which keeps light/dark handling in one place and the renderer free of the DOM.
 */

/** Colours the renderer paints with, all resolved by the caller. */
export interface WaveformTheme {
  background: string;
  baseline: string;
  trace: string;
  marker: string;
  markerSelected: string;
  surahBound: string;
  /** Handle text on a dark marker. */
  label: string;
  /** Handle text on the light accent used for the selected marker. */
  selectedLabel: string;
  labelBackground: string;
  playhead: string;
  /** Tint filling the silence between two ayahs — where a correct boundary belongs. */
  pauseBand: string;
}

/** Everything needed to draw one frame. */
export interface WaveformScene {
  peaks: WaveformPeaks | null;
  markers: readonly EditorMarker[];
  selectedId: string | null;
  playheadMs: number;
  view: WaveformView;
}

/** Below this spacing, ayah labels would overlap, so they are dropped rather than stacked. */
const MIN_LABEL_SPACING_PX = 30;

/**
 * Unselected stems sit behind the trace rather than fencing it off. Every ayah has two
 * boundaries only a pause apart, so at full-track zoom solid stems read as a picket fence.
 */
const STEM_ALPHA = 0.55;

/** Marker stems. Wide enough to read as grabbable objects rather than as grid lines. */
const MARKER_WIDTH_PX = 2;
const SELECTED_MARKER_WIDTH_PX = 3;

/** A soft band behind the selected marker, so the eye finds it without hunting. */
const SELECTION_HALO_WIDTH_PX = 11;
const SELECTION_HALO_ALPHA = 0.16;

/**
 * The grab handle at the top of every marker — the part a pointer aims for.
 * Exported so tests can identify handles without guessing at pixel sizes.
 */
export const HANDLE_HEIGHT = 18;
const HANDLE_MIN_WIDTH = 10;
const HANDLE_RADIUS = 4;
const HANDLE_TOP = 3;

/**
 * An ayah's closing boundary gets a cap at the bottom instead of the top. Anchoring opens and
 * closes to opposite edges is what makes a pair of adjacent stems readable as "this ayah ends,
 * the next begins" rather than as two identical lines.
 */
export const END_CAP_HEIGHT = 8;
const END_CAP_WIDTH = 14;
const END_CAP_BOTTOM_INSET = 3;

/**
 * Pauses are shaded rather than the ayahs themselves. Ayahs run back to back, so tinting them
 * washes the whole background; the gaps between them are narrow, and shading those turns each
 * boundary pair into a visible stripe instead.
 */
const PAUSE_BAND_ALPHA = 0.22;

const PLAYHEAD_WIDTH_PX = 2;
const PLAYHEAD_FOOT_WIDTH_PX = 8;

const LABEL_FONT = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
const LABEL_PADDING_X = 5;

export class WaveformRenderer {
  private width = 0;
  private height = 0;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private theme: WaveformTheme
  ) {}

  /**
   * Matches the backing store to the element's CSS size and the display's pixel density.
   * Without the ratio scale the trace renders soft on every retina screen.
   */
  resize(width: number, height: number, devicePixelRatio: number): void {
    this.width = width;
    this.height = height;

    const canvas = this.ctx.canvas;
    canvas.width = Math.max(1, Math.round(width * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(height * devicePixelRatio));

    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  setTheme(theme: WaveformTheme): void {
    this.theme = theme;
  }

  draw(scene: WaveformScene): void {
    if (this.width <= 0 || this.height <= 0) return;

    this.drawBackground();
    this.drawPauseBands(scene);
    this.drawTrace(scene);
    this.drawMarkers(scene);
    this.drawPlayhead(scene);
  }

  private drawBackground(): void {
    this.ctx.fillStyle = this.theme.background;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const mid = this.height / 2;
    this.ctx.fillStyle = this.theme.baseline;
    this.ctx.fillRect(0, mid, this.width, 1);
  }

  /**
   * Shades the silence between one ayah's close and the next one's open. It reads as a stripe
   * at full-track zoom and as an obvious gap when zoomed in, which is what tells an admin where
   * ayah N stopped — and, since reciters pause between ayahs, where a correct boundary belongs.
   */
  private drawPauseBands({ markers, view }: WaveformScene): void {
    const groups = groupByAyah(markers);
    if (groups.length < 2) return;

    this.ctx.save();
    this.ctx.fillStyle = this.theme.pauseBand;
    this.ctx.globalAlpha = PAUSE_BAND_ALPHA;

    for (let i = 1; i < groups.length; i++) {
      const previous = groups[i - 1];
      const current = groups[i];

      // Only the gap between two consecutive ayahs is silence. Dropping incomplete or absent
      // ayahs from the list first would shade from ayah 1's end to ayah 3's start and so mark
      // the whole of ayah 2 as a pause.
      if (!previous.end || !current.start || current.ayah !== previous.ayah + 1) continue;

      const from = msToX(previous.end.ms, view, this.width);
      const to = msToX(current.start.ms, view, this.width);

      if (to < 0 || from > this.width || to <= from) continue;

      this.ctx.fillRect(from, 0, Math.max(1, to - from), this.height);
    }

    this.ctx.restore();
  }

  /**
   * One column per CSS pixel. When peaks are unavailable — a track too large to decode, or a
   * host without CORS — the baseline alone is drawn and the markers remain fully editable.
   */
  private drawTrace({ peaks, view }: WaveformScene): void {
    if (!peaks) return;

    const columns = Math.floor(this.width);
    const values = peaksForWindow(peaks, view.startMs, view.endMs, columns);
    const mid = this.height / 2;
    const scale = this.height / 2;

    this.ctx.fillStyle = this.theme.trace;

    for (let column = 0; column < columns; column++) {
      const min = values[column * 2];
      const max = values[column * 2 + 1];
      const top = mid - max * scale;
      const bottom = mid - min * scale;

      // Keep silence visible as a hairline rather than as a gap in the trace.
      this.ctx.fillRect(column, top, 1, Math.max(1, bottom - top));
    }
  }

  /**
   * Each marker is a stem plus a handle: the stem shows the exact boundary, the handle gives
   * the pointer something to aim at and carries the ayah number when there is room.
   * The selected marker is drawn last so its halo never sits under a neighbour.
   */
  private drawMarkers(scene: WaveformScene): void {
    const markers = visibleMarkers(scene.markers, scene.view);
    const isSelected = (marker: EditorMarker) => marker.id === scene.selectedId;
    const xOf = (marker: EditorMarker) => Math.round(msToX(marker.ms, scene.view, this.width));

    // Selected last, so its halo and thicker stem are never drawn over by a neighbour.
    for (const marker of [
      ...markers.filter((m) => !isSelected(m)),
      ...markers.filter(isSelected),
    ]) {
      const colour = this.markerColour(marker, isSelected(marker));

      if (isSelected(marker)) this.drawSelectionHalo(xOf(marker), colour);
      this.drawStem(xOf(marker), colour, isSelected(marker));
    }

    this.drawEndCaps(markers, scene.selectedId, xOf);
    this.drawHandles(markers, scene.selectedId, xOf);
  }

  /** A cap at the foot of every closing boundary, mirroring the handle at the head of an opening one. */
  private drawEndCaps(
    markers: readonly EditorMarker[],
    selectedId: string | null,
    xOf: (marker: EditorMarker) => number
  ): void {
    for (const marker of markers.filter((m) => m.kind === 'ayah-end')) {
      const left = clamp(
        xOf(marker) - END_CAP_WIDTH / 2,
        0,
        Math.max(0, this.width - END_CAP_WIDTH)
      );

      this.ctx.fillStyle = this.markerColour(marker, marker.id === selectedId);
      this.fillRoundedRect(
        left,
        this.height - END_CAP_HEIGHT - END_CAP_BOTTOM_INSET,
        END_CAP_WIDTH,
        END_CAP_HEIGHT,
        HANDLE_RADIUS
      );
    }
  }

  /**
   * Handles are placed by priority, and one that would overlap an already-placed handle is
   * dropped rather than stacked. Surah bounds routinely share a timestamp with the first and
   * last ayah, so without this the brackets and the ayah numbers sit on top of each other.
   */
  private drawHandles(
    markers: readonly EditorMarker[],
    selectedId: string | null,
    xOf: (marker: EditorMarker) => number
  ): void {
    const candidates = markers.filter((m) => carriesHandle(m) || m.id === selectedId);
    const roomForLabels = this.hasRoomForLabels(candidates);
    const placed: { from: number; to: number }[] = [];

    for (const marker of byHandlePriority(candidates, selectedId)) {
      const selected = marker.id === selectedId;
      const label = labelFor(marker);
      const withText = roomForLabels || selected;
      const width = this.handleWidth(label, withText);
      const from = clamp(xOf(marker) - width / 2, 0, Math.max(0, this.width - width));
      const to = from + width;

      if (placed.some((slot) => from < slot.to && to > slot.from)) continue;
      placed.push({ from, to });

      this.drawHandle(label, from, width, {
        fill: this.markerColour(marker, selected),
        text: selected ? this.theme.selectedLabel : this.theme.label,
        withText,
      });
    }
  }

  private drawStem(x: number, colour: string, selected: boolean): void {
    const width = selected ? SELECTED_MARKER_WIDTH_PX : MARKER_WIDTH_PX;

    this.ctx.save();
    if (!selected) this.ctx.globalAlpha = STEM_ALPHA;
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(x - Math.floor(width / 2), 0, width, this.height);
    this.ctx.restore();
  }

  private drawSelectionHalo(x: number, colour: string): void {
    this.ctx.save();
    this.ctx.globalAlpha = SELECTION_HALO_ALPHA;
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(x - SELECTION_HALO_WIDTH_PX / 2, 0, SELECTION_HALO_WIDTH_PX, this.height);
    this.ctx.restore();
  }

  private handleWidth(label: string, withText: boolean): number {
    if (!withText) return HANDLE_MIN_WIDTH;

    this.ctx.font = LABEL_FONT;

    return Math.max(HANDLE_MIN_WIDTH, this.ctx.measureText(label).width + LABEL_PADDING_X * 2);
  }

  /** A filled cap in the marker's colour, carrying the ayah number when it fits. */
  private drawHandle(
    label: string,
    left: number,
    width: number,
    { fill, text, withText }: { fill: string; text: string; withText: boolean }
  ): void {
    this.ctx.fillStyle = fill;
    this.fillRoundedRect(left, HANDLE_TOP, width, HANDLE_HEIGHT, HANDLE_RADIUS);

    if (!withText) return;

    this.ctx.font = LABEL_FONT;
    this.ctx.fillStyle = text;
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, left + width / 2, HANDLE_TOP + HANDLE_HEIGHT / 2 + 0.5);
    this.ctx.textAlign = 'left';
  }

  /** `roundRect` is not in every engine this app targets, so square corners are the fallback. */
  private fillRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    if (typeof this.ctx.roundRect !== 'function') {
      this.ctx.fillRect(x, y, width, height);
      return;
    }

    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
    this.ctx.fill();
  }

  private drawPlayhead({ playheadMs, view }: WaveformScene): void {
    if (playheadMs < view.startMs || playheadMs > view.endMs) return;

    const x = Math.round(msToX(playheadMs, view, this.width));

    this.ctx.fillStyle = this.theme.playhead;
    this.ctx.fillRect(x - 1, 0, PLAYHEAD_WIDTH_PX, this.height);
    // A foot at the baseline makes the playhead findable against a busy trace.
    this.ctx.fillRect(x - PLAYHEAD_FOOT_WIDTH_PX / 2, this.height - 4, PLAYHEAD_FOOT_WIDTH_PX, 4);
  }

  private markerColour(marker: EditorMarker, selected: boolean): string {
    if (selected) return this.theme.markerSelected;

    return isSurahBound(marker) ? this.theme.surahBound : this.theme.marker;
  }

  /** Labels are dropped wholesale rather than drawn overlapping when markers crowd together. */
  private hasRoomForLabels(markers: readonly EditorMarker[]): boolean {
    if (markers.length < 2) return true;

    return this.width / markers.length >= MIN_LABEL_SPACING_PX;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isSurahBound(marker: EditorMarker): boolean {
  return marker.kind === 'surah-start' || marker.kind === 'surah-end';
}

/** Selected first, then ayah numbers, then surah brackets — the least useful label gives way. */
function byHandlePriority(
  markers: readonly EditorMarker[],
  selectedId: string | null
): EditorMarker[] {
  const rank = (marker: EditorMarker): number => {
    if (marker.id === selectedId) return 0;
    return isSurahBound(marker) ? 2 : 1;
  };

  return [...markers].sort((a, b) => rank(a) - rank(b) || a.ms - b.ms);
}

/** Closing boundaries stay unhandled until selected — one handle per ayah keeps it readable. */
function carriesHandle(marker: EditorMarker): boolean {
  return marker.kind !== 'ayah-end';
}

function labelFor(marker: EditorMarker): string {
  if (marker.kind === 'surah-start') return '⟦';
  if (marker.kind === 'surah-end') return '⟧';

  return String(marker.ayah ?? '');
}
