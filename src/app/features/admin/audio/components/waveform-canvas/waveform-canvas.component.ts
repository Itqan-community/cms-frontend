import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { EditorMarker } from '../../models/audio-timestamps.models';
import { markerAtX, xToMs, zoomView, type WaveformView } from '../../utils/waveform-geometry.util';
import type { WaveformPeaks } from '../../utils/waveform-peaks.util';
import { WaveformRenderer, type WaveformTheme } from './waveform-renderer';

/**
 * Presentational waveform. Draws peaks, boundary markers and the playhead, and reports what
 * the pointer is doing — nothing else.
 *
 * It deliberately knows no rules: a drag emits the millisecond the pointer is over, and the
 * parent decides whether that move is legal. Clamping a marker against its neighbours is a
 * decision about ayah boundaries, which is not this component's business.
 */

/** A drag in progress, reported to the parent on every move. */
export interface MarkerDragEvent {
  markerId: string;
  ms: number;
}

/** CSS custom properties the theme is read from, so light and dark come for free. */
const THEME_PROPERTIES: Record<keyof WaveformTheme, string> = {
  background: '--admin-surface-100',
  baseline: '--admin-border-300',
  trace: '--color-primary-400',
  marker: '--color-primary-800',
  markerSelected: '--color-action-edit',
  surahBound: '--color-secondary-500',
  label: '--admin-surface-white',
  selectedLabel: '--admin-text-900',
  labelBackground: '--admin-surface-white',
  playhead: '--color-action-delete',
  pauseBand: '--color-secondary-400',
};

const ZOOM_IN_FACTOR = 0.85;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

@Component({
  selector: 'app-waveform-canvas',
  standalone: true,
  template: `<canvas
    #canvas
    class="waveform-canvas__surface"
    role="img"
    [attr.aria-label]="ariaLabel()"
  ></canvas>`,
  styleUrl: './waveform-canvas.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'waveform-canvas',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '(wheel)': 'onWheel($event)',
  },
})
export class WaveformCanvasComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly peaks = input<WaveformPeaks | null>(null);
  readonly markers = input<readonly EditorMarker[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly playheadMs = input(0);
  readonly durationMs = input(0);
  readonly view = input.required<WaveformView>();
  readonly editable = input(true);
  readonly ariaLabel = input('Waveform');

  /** The pointer asked to move playback to this timestamp. */
  readonly seek = output<number>();
  readonly markerGrabbed = output<string>();
  readonly markerDragged = output<MarkerDragEvent>();
  readonly markerReleased = output<void>();
  readonly viewChanged = output<WaveformView>();

  private renderer: WaveformRenderer | null = null;
  private draggingMarkerId: string | null = null;

  constructor() {
    afterNextRender(() => this.initialise());

    // Signal inputs are read here, so any change to them repaints without manual plumbing.
    effect(() => {
      const scene = {
        peaks: this.peaks(),
        markers: this.markers(),
        selectedId: this.selectedId(),
        playheadMs: this.playheadMs(),
        view: this.view(),
      };

      this.renderer?.draw(scene);
    });
  }

  private initialise(): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d');
    if (!context) return;

    this.renderer = new WaveformRenderer(context, this.readTheme());
    this.observeSize();
  }

  /**
   * Redraws on element resize rather than on window resize: the editor's panel can change
   * width without the window doing so.
   */
  private observeSize(): void {
    const element = this.host.nativeElement;
    const observer = new ResizeObserver(() => this.applySize());

    observer.observe(element);
    this.destroyRef.onDestroy(() => observer.disconnect());

    this.applySize();
  }

  private applySize(): void {
    const { width, height } = this.host.nativeElement.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;

    this.renderer?.setTheme(this.readTheme());
    this.renderer?.resize(width, height, window.devicePixelRatio || 1);
    this.redraw();
  }

  private redraw(): void {
    this.renderer?.draw({
      peaks: this.peaks(),
      markers: this.markers(),
      selectedId: this.selectedId(),
      playheadMs: this.playheadMs(),
      view: this.view(),
    });
  }

  /** Resolves theme tokens from CSS, so the canvas follows the app's light/dark palette. */
  private readTheme(): WaveformTheme {
    const styles = getComputedStyle(this.host.nativeElement);
    const entries = Object.entries(THEME_PROPERTIES).map(([key, property]) => [
      key,
      styles.getPropertyValue(property).trim() || '#888',
    ]);

    return Object.fromEntries(entries) as WaveformTheme;
  }

  // --- pointer ---

  onPointerDown(event: PointerEvent): void {
    const x = this.offsetX(event);
    const width = this.widthPx();
    const marker = this.editable() ? markerAtX(this.markers(), x, this.view(), width) : null;

    if (marker) {
      this.draggingMarkerId = marker.id;
      this.host.nativeElement.setPointerCapture(event.pointerId);
      this.markerGrabbed.emit(marker.id);
      return;
    }

    this.seek.emit(this.msAt(x));
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.draggingMarkerId) return;

    event.preventDefault();
    this.markerDragged.emit({
      markerId: this.draggingMarkerId,
      ms: this.msAt(this.offsetX(event)),
    });
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.draggingMarkerId) return;

    this.draggingMarkerId = null;
    this.host.nativeElement.releasePointerCapture(event.pointerId);
    this.markerReleased.emit();
  }

  /** Zooms around the pointer, so the audio under the cursor stays put. */
  onWheel(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();
    const factor = event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
    const anchorMs = this.msAt(this.offsetX(event));

    this.viewChanged.emit(zoomView(this.view(), this.durationMs(), factor, anchorMs));
  }

  private msAt(x: number): number {
    return Math.round(xToMs(x, this.view(), this.widthPx()));
  }

  private offsetX(event: PointerEvent | WheelEvent): number {
    return event.clientX - this.host.nativeElement.getBoundingClientRect().left;
  }

  private widthPx(): number {
    return this.host.nativeElement.getBoundingClientRect().width;
  }
}
