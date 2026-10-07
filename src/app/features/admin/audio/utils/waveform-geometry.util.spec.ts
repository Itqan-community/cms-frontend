import type { EditorMarker } from '../models/audio-timestamps.models';
import {
  MIN_VIEW_MS,
  clampView,
  markerAtX,
  msToX,
  panView,
  viewAround,
  visibleMarkers,
  xToMs,
  zoomView,
  type WaveformView,
} from './waveform-geometry.util';

const WIDTH = 1_000;
const DURATION_MS = 60_000;
const FULL: WaveformView = { startMs: 0, endMs: 60_000 };

function marker(id: string, ms: number): EditorMarker {
  return { id, kind: 'ayah-start', ayah: 1, ms, originalMs: ms };
}

describe('msToX and xToMs', () => {
  it('puts the start of the view at the left edge', () => {
    expect(msToX(0, FULL, WIDTH)).toBe(0);
  });

  it('puts the end of the view at the right edge', () => {
    expect(msToX(60_000, FULL, WIDTH)).toBe(WIDTH);
  });

  it('places a timestamp proportionally', () => {
    expect(msToX(15_000, FULL, WIDTH)).toBe(250);
  });

  it('maps a zoomed window to the full width', () => {
    const zoomed: WaveformView = { startMs: 10_000, endMs: 20_000 };

    expect(msToX(15_000, zoomed, WIDTH)).toBe(500);
  });

  it('round-trips a position back to its timestamp', () => {
    expect(xToMs(msToX(37_400, FULL, WIDTH), FULL, WIDTH)).toBeCloseTo(37_400, 6);
  });

  it('returns a position outside the canvas for a timestamp outside the view', () => {
    const zoomed: WaveformView = { startMs: 10_000, endMs: 20_000 };

    expect(msToX(5_000, zoomed, WIDTH) < 0).toBeTrue();
  });

  it('survives a zero-width canvas before the first layout', () => {
    expect(msToX(15_000, FULL, 0)).toBe(0);
    expect(xToMs(0, FULL, 0)).toBe(FULL.startMs);
  });

  it('survives a collapsed view', () => {
    expect(msToX(1_000, { startMs: 5_000, endMs: 5_000 }, WIDTH)).toBe(0);
  });
});

describe('clampView', () => {
  it('leaves a valid view alone', () => {
    expect(clampView({ startMs: 10_000, endMs: 20_000 }, DURATION_MS)).toEqual({
      startMs: 10_000,
      endMs: 20_000,
    });
  });

  it('pulls a view back inside the start of the track', () => {
    expect(clampView({ startMs: -5_000, endMs: 5_000 }, DURATION_MS)).toEqual({
      startMs: 0,
      endMs: 10_000,
    });
  });

  it('pulls a view back inside the end of the track', () => {
    expect(clampView({ startMs: 58_000, endMs: 68_000 }, DURATION_MS)).toEqual({
      startMs: 50_000,
      endMs: 60_000,
    });
  });

  it('refuses to zoom past the minimum window', () => {
    const clamped = clampView({ startMs: 10_000, endMs: 10_050 }, DURATION_MS);

    expect(clamped.endMs - clamped.startMs).toBe(MIN_VIEW_MS);
  });

  it('never shows more than the whole track', () => {
    expect(clampView({ startMs: 0, endMs: 900_000 }, DURATION_MS)).toEqual({
      startMs: 0,
      endMs: 60_000,
    });
  });
});

describe('zoomView', () => {
  it('keeps the anchored timestamp under the pointer', () => {
    const zoomed = zoomView(FULL, DURATION_MS, 0.5, 15_000);

    expect(msToX(15_000, zoomed, WIDTH)).toBeCloseTo(msToX(15_000, FULL, WIDTH), 6);
  });

  it('halves the visible span when zooming in', () => {
    const zoomed = zoomView(FULL, DURATION_MS, 0.5, 30_000);

    expect(zoomed.endMs - zoomed.startMs).toBe(30_000);
  });

  it('stops at the whole track when zooming out', () => {
    const zoomed = zoomView({ startMs: 20_000, endMs: 40_000 }, DURATION_MS, 10, 30_000);

    expect(zoomed).toEqual({ startMs: 0, endMs: 60_000 });
  });

  it('stops at the minimum window when zooming in hard', () => {
    const zoomed = zoomView(FULL, DURATION_MS, 0.000_1, 30_000);

    expect(zoomed.endMs - zoomed.startMs).toBe(MIN_VIEW_MS);
  });

  it('stays inside the track when anchored at the very start', () => {
    const zoomed = zoomView(FULL, DURATION_MS, 0.5, 0);

    expect(zoomed.startMs).toBe(0);
  });
});

describe('panView and viewAround', () => {
  it('scrolls forward by the requested amount', () => {
    expect(panView({ startMs: 10_000, endMs: 20_000 }, DURATION_MS, 5_000)).toEqual({
      startMs: 15_000,
      endMs: 25_000,
    });
  });

  it('stops at the end of the track instead of scrolling past it', () => {
    expect(panView({ startMs: 50_000, endMs: 60_000 }, DURATION_MS, 10_000)).toEqual({
      startMs: 50_000,
      endMs: 60_000,
    });
  });

  it('centres on a timestamp without changing the zoom level', () => {
    const centred = viewAround({ startMs: 0, endMs: 10_000 }, DURATION_MS, 30_000);

    expect(centred).toEqual({ startMs: 25_000, endMs: 35_000 });
    expect(centred.endMs - centred.startMs).toBe(10_000);
  });

  it('keeps the window on screen when centring near the start', () => {
    expect(viewAround({ startMs: 20_000, endMs: 30_000 }, DURATION_MS, 1_000)).toEqual({
      startMs: 0,
      endMs: 10_000,
    });
  });
});

describe('visibleMarkers', () => {
  const markers = [marker('a', 5_000), marker('b', 15_000), marker('c', 55_000)];

  it('drops markers outside the window', () => {
    expect(visibleMarkers(markers, { startMs: 10_000, endMs: 20_000 }).map((m) => m.id)).toEqual([
      'b',
    ]);
  });

  it('keeps markers exactly on the edges', () => {
    expect(visibleMarkers(markers, { startMs: 5_000, endMs: 15_000 }).map((m) => m.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('returns nothing for a window with no markers', () => {
    expect(visibleMarkers(markers, { startMs: 20_000, endMs: 30_000 })).toEqual([]);
  });
});

describe('markerAtX', () => {
  const markers = [marker('a', 15_000), marker('b', 30_000)];

  it('grabs a marker directly under the pointer', () => {
    expect(markerAtX(markers, msToX(15_000, FULL, WIDTH), FULL, WIDTH)?.id).toBe('a');
  });

  it('grabs a marker just inside the tolerance', () => {
    expect(markerAtX(markers, msToX(15_000, FULL, WIDTH) + 5, FULL, WIDTH)?.id).toBe('a');
  });

  it('grabs nothing outside the tolerance', () => {
    expect(markerAtX(markers, msToX(15_000, FULL, WIDTH) + 40, FULL, WIDTH)).toBeNull();
  });

  it('picks the closer of two markers within tolerance', () => {
    const crowded = [marker('near', 15_000), marker('far', 15_150)];
    const x = msToX(15_020, FULL, WIDTH);

    expect(markerAtX(crowded, x, FULL, WIDTH, 40)?.id).toBe('near');
  });

  it('ignores markers scrolled out of view', () => {
    const zoomed: WaveformView = { startMs: 25_000, endMs: 35_000 };

    expect(markerAtX(markers, msToX(15_000, zoomed, WIDTH), zoomed, WIDTH)).toBeNull();
  });

  it('grabs nothing when there are no markers', () => {
    expect(markerAtX([], 100, FULL, WIDTH)).toBeNull();
  });
});
