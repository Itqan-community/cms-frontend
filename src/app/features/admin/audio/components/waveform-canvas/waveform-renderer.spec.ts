import type { EditorMarker } from '../../models/audio-timestamps.models';
import type { WaveformPeaks } from '../../utils/waveform-peaks.util';
import {
  END_CAP_HEIGHT,
  HANDLE_HEIGHT,
  WaveformRenderer,
  type WaveformScene,
  type WaveformTheme,
} from './waveform-renderer';

/**
 * The renderer takes a context rather than finding one, so a stub is enough to assert what it
 * paints — no DOM, no fixture, no screenshot.
 */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

/** The subset of the 2D context the renderer actually touches. */
interface StubContext {
  canvas: { width: number; height: number };
  fillStyle: string;
  font: string;
  textBaseline: string;
  globalAlpha: number;
  save(): void;
  restore(): void;
  setTransform(): void;
  measureText(text: string): { width: number };
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string): void;
}

function stubContext(): { ctx: CanvasRenderingContext2D; rects: Rect[]; texts: string[] } {
  const rects: Rect[] = [];
  const texts: string[] = [];

  const stub: StubContext = {
    canvas: { width: 0, height: 0 },
    fillStyle: '',
    font: '',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    // roundRect is intentionally absent: the renderer's square-corner fallback is what
    // records a plain fillRect, which is what these assertions read.
    save: () => undefined,
    restore: () => undefined,
    setTransform: () => undefined,
    measureText: (text) => ({ width: text.length * 6 }),
    fillRect: (x, y, w, h) => {
      rects.push({ x, y, w, h, fill: stub.fillStyle });
    },
    fillText: (text) => {
      texts.push(text);
    },
  };

  return { ctx: stub as unknown as CanvasRenderingContext2D, rects, texts };
}

const THEME: WaveformTheme = {
  background: 'bg',
  baseline: 'baseline',
  trace: 'trace',
  marker: 'marker',
  markerSelected: 'selected',
  surahBound: 'surah',
  label: 'label',
  selectedLabel: 'selectedLabel',
  labelBackground: 'labelBg',
  playhead: 'playhead',
  pauseBand: 'pause',
};

function marker(id: string, ms: number, overrides: Partial<EditorMarker> = {}): EditorMarker {
  return { id, kind: 'ayah-start', ayah: 1, ms, originalMs: ms, ...overrides };
}

/** Loud throughout, so the trace is unambiguous. */
function peaks(): WaveformPeaks {
  const data = new Float32Array(200);
  for (let i = 0; i < 100; i++) {
    data[i * 2] = -0.8;
    data[i * 2 + 1] = 0.8;
  }

  return { durationMs: 1_000, resolution: 100, data };
}

function scene(overrides: Partial<WaveformScene> = {}): WaveformScene {
  return {
    peaks: null,
    markers: [],
    selectedId: null,
    playheadMs: 0,
    view: { startMs: 0, endMs: 1_000 },
    ...overrides,
  };
}

describe('WaveformRenderer', () => {
  it('draws nothing before the element has been laid out', () => {
    const { ctx, rects } = stubContext();
    new WaveformRenderer(ctx, THEME).draw(scene());

    expect(rects.length).toBe(0);
  });

  it('scales the backing store to the device pixel ratio', () => {
    const { ctx } = stubContext();
    new WaveformRenderer(ctx, THEME).resize(100, 50, 2);

    expect(ctx.canvas.width).toBe(200);
    expect(ctx.canvas.height).toBe(100);
  });

  it('paints a background and a baseline', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);
    renderer.draw(scene());

    expect(rects[0].fill).toBe('bg');
    expect(rects[1].fill).toBe('baseline');
  });

  it('draws the trace only when peaks are available', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.draw(scene());
    expect(rects.filter((r) => r.fill === 'trace').length).toBe(0);

    renderer.draw(scene({ peaks: peaks() }));
    expect(rects.filter((r) => r.fill === 'trace').length).toBe(100);
  });

  it('keeps markers drawable when the waveform is missing', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.draw(scene({ peaks: null, markers: [marker('a', 500)] }));

    expect(rects.some((r) => r.fill === 'marker')).toBeTrue();
  });

  it('draws the selected marker with a halo behind a thicker stem', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.draw(scene({ markers: [marker('a', 500)], selectedId: 'a' }));

    const fullHeight = rects.filter((r) => r.fill === 'selected' && r.h === 50);
    const [halo, stem] = fullHeight;

    expect(halo.w).toBeGreaterThan(stem.w);
    expect(stem.w).toBe(3);
  });

  it('draws unselected ayah markers thick enough to grab', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.draw(scene({ markers: [marker('a', 500)] }));

    expect(rects.find((r) => r.fill === 'marker' && r.h === 50)?.w).toBe(2);
  });

  /** Handles are the caps at the top; stems, the baseline and the playhead foot are not. */
  const handles = (rects: Rect[]) => rects.filter((r) => r.h === HANDLE_HEIGHT);

  it('gives an ayah boundary a handle to aim at', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.draw(scene({ markers: [marker('a', 500)] }));

    expect(handles(rects).length).toBe(1);
  });

  it('leaves a closing boundary unhandled until it is selected', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);
    const end = marker('a-end', 500, { kind: 'ayah-end' });

    renderer.draw(scene({ markers: [end] }));
    expect(handles(rects).length).toBe(0);

    rects.length = 0;
    renderer.draw(scene({ markers: [end], selectedId: 'a-end' }));
    expect(handles(rects).length).toBe(1);
  });

  it('drops a handle that would overlap one already placed', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    // A surah bound sharing a timestamp with the first ayah is the common real case.
    renderer.draw(
      scene({
        markers: [
          marker('surah-start', 500, { kind: 'surah-start', ayah: null }),
          marker('ayah-1-start', 500),
        ],
      })
    );

    expect(handles(rects).length).toBe(1);
  });

  it('caps a closing boundary at the foot, opposite the opening handle', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.draw(scene({ markers: [marker('a-end', 500, { kind: 'ayah-end' })] }));

    const cap = rects.find((r) => r.h === END_CAP_HEIGHT);
    expect(cap).toBeTruthy();
    // Anchored to the bottom edge, which is what distinguishes it from a start handle.
    expect(cap!.y).toBeGreaterThan(25);
  });

  it('shades the pause between one ayah closing and the next opening', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.draw(
      scene({
        markers: [
          marker('a1-start', 0, { ayah: 1 }),
          marker('a1-end', 400, { kind: 'ayah-end', ayah: 1 }),
          marker('a2-start', 600, { ayah: 2 }),
          marker('a2-end', 900, { kind: 'ayah-end', ayah: 2 }),
        ],
      })
    );

    const band = rects.find((r) => r.fill === 'pause');
    expect(band).toBeTruthy();
    // 400 ms → 600 ms of a 1000 ms view across 100 px.
    expect(band!.x).toBeCloseTo(40, 0);
    expect(band!.w).toBeCloseTo(20, 0);
  });

  it('shades nothing when an ayah has no closing boundary to pause after', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.draw(scene({ markers: [marker('a1-start', 0, { ayah: 1 })] }));

    expect(rects.some((r) => r.fill === 'pause')).toBeFalse();
  });

  it('drops labels when markers crowd together', () => {
    const { ctx, texts } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    const crowded = Array.from({ length: 40 }, (_, i) => marker(`m${i}`, i * 25));
    renderer.draw(scene({ markers: crowded }));

    expect(texts.length).toBe(0);
  });

  it('always labels the selected marker, however crowded', () => {
    const { ctx, texts } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    const crowded = Array.from({ length: 40 }, (_, i) => marker(`m${i}`, i * 25));
    renderer.draw(scene({ markers: crowded, selectedId: 'm10' }));

    expect(texts.length).toBe(1);
  });

  it('draws the playhead only while it is on screen', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.draw(scene({ playheadMs: 500 }));
    expect(rects.some((r) => r.fill === 'playhead')).toBeTrue();

    rects.length = 0;
    renderer.draw(scene({ playheadMs: 5_000 }));
    expect(rects.some((r) => r.fill === 'playhead')).toBeFalse();
  });

  it('repaints with a new theme without being rebuilt', () => {
    const { ctx, rects } = stubContext();
    const renderer = new WaveformRenderer(ctx, THEME);
    renderer.resize(100, 50, 1);

    renderer.setTheme({ ...THEME, background: 'dark-bg' });
    renderer.draw(scene());

    expect(rects[0].fill).toBe('dark-bg');
  });
});
