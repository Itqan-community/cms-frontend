import type { EditorMarker, TrackTimestamps } from '../models/audio-timestamps.models';
import {
  MIN_MARKER_GAP_MS,
  applyMarkers,
  buildMarkers,
  hasUnsavedChanges,
  markerAfter,
  markerBefore,
  markerDrift,
  moveMarker,
  nearestMarker,
  neighbourBounds,
  nudgeMarker,
  validateMarkers,
} from './timestamp-markers.util';

const DURATION_MS = 60_000;

function makeTimestamps(overrides: Partial<TrackTimestamps> = {}): TrackTimestamps {
  return {
    track_id: 12,
    surah_number: 1,
    surah: { start_ms: 0, end_ms: 40_000 },
    ayahs: [
      { ayah: 1, start_ms: 0, end_ms: 9_000 },
      { ayah: 2, start_ms: 10_000, end_ms: 19_000 },
      { ayah: 3, start_ms: 20_000, end_ms: 29_000 },
    ],
    ...overrides,
  };
}

describe('buildMarkers', () => {
  it('flattens surah bounds and ayah bounds into one time-ordered list', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(markers.length).toBe(8);
    expect(markers.map((m) => m.ms)).toEqual([0, 0, 9_000, 10_000, 19_000, 20_000, 29_000, 40_000]);
  });

  it('puts the surah start before the first ayah start when they share a timestamp', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(markers[0].kind).toBe('surah-start');
    expect(markers[1].id).toBe('ayah-1-start');
  });

  it('records the loaded value as the original, so nothing reads as dirty', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(markers.every((m) => m.ms === m.originalMs)).toBe(true);
    expect(hasUnsavedChanges(markers)).toBe(false);
  });

  it('handles a timing file that carries ayah bounds only', () => {
    const markers = buildMarkers(makeTimestamps({ surah: null }));

    expect(markers.length).toBe(6);
    expect(markers.some((m) => m.kind === 'surah-start')).toBe(false);
  });
});

describe('applyMarkers', () => {
  it('round-trips an untouched marker list back to the source payload', () => {
    const source = makeTimestamps();

    expect(applyMarkers(buildMarkers(source), source)).toEqual(source);
  });

  it('carries an edit back into the ayah array', () => {
    const source = makeTimestamps();
    const moved = moveMarker(buildMarkers(source), 'ayah-2-start', 10_450, DURATION_MS);

    const result = applyMarkers(moved, source);

    expect(result.ayahs[1].start_ms).toBe(10_450);
    expect(result.ayahs[0]).toEqual(source.ayahs[0]);
  });

  it('keeps track identity from the base payload', () => {
    const source = makeTimestamps();

    const result = applyMarkers(buildMarkers(source), source);

    expect(result.track_id).toBe(12);
    expect(result.surah_number).toBe(1);
  });
});

describe('neighbourBounds', () => {
  it('fences a marker between its immediate neighbours', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(neighbourBounds(markers, 'ayah-2-start', DURATION_MS)).toEqual({
      min: 9_000 + MIN_MARKER_GAP_MS,
      max: 19_000 - MIN_MARKER_GAP_MS,
    });
  });

  it('bounds the first marker by the start of the track', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(neighbourBounds(markers, 'ayah-1-start', DURATION_MS).min).toBe(0);
  });

  it('bounds the last marker by the track duration', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(neighbourBounds(markers, 'ayah-3-end', DURATION_MS).max).toBe(DURATION_MS);
  });

  it('leaves surah bounds free of the ayah chain', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(neighbourBounds(markers, 'surah-end', DURATION_MS)).toEqual({
      min: 0,
      max: DURATION_MS,
    });
  });
});

describe('moveMarker', () => {
  it('moves a marker to an exact millisecond', () => {
    const markers = moveMarker(buildMarkers(makeTimestamps()), 'ayah-2-start', 10_450, DURATION_MS);

    expect(markers.find((m) => m.id === 'ayah-2-start')?.ms).toBe(10_450);
  });

  it('refuses to let a marker cross the one before it', () => {
    const markers = moveMarker(buildMarkers(makeTimestamps()), 'ayah-2-start', 1_000, DURATION_MS);

    expect(markers.find((m) => m.id === 'ayah-2-start')?.ms).toBe(9_000 + MIN_MARKER_GAP_MS);
  });

  it('refuses to let a marker cross the one after it', () => {
    const markers = moveMarker(buildMarkers(makeTimestamps()), 'ayah-2-start', 50_000, DURATION_MS);

    expect(markers.find((m) => m.id === 'ayah-2-start')?.ms).toBe(19_000 - MIN_MARKER_GAP_MS);
  });

  it('clamps a negative position to the start of the track', () => {
    const markers = moveMarker(buildMarkers(makeTimestamps()), 'ayah-1-start', -5_000, DURATION_MS);

    expect(markers.find((m) => m.id === 'ayah-1-start')?.ms).toBe(0);
  });

  it('rounds sub-millisecond pointer positions', () => {
    const markers = moveMarker(
      buildMarkers(makeTimestamps()),
      'ayah-2-start',
      10_450.6,
      DURATION_MS
    );

    expect(markers.find((m) => m.id === 'ayah-2-start')?.ms).toBe(10_451);
  });

  it('leaves every other marker untouched', () => {
    const before = buildMarkers(makeTimestamps());
    const after = moveMarker(before, 'ayah-2-start', 10_450, DURATION_MS);

    expect(after.filter((m) => m.id !== 'ayah-2-start')).toEqual(
      before.filter((m) => m.id !== 'ayah-2-start')
    );
  });

  it('ignores an unknown marker id', () => {
    const before = buildMarkers(makeTimestamps());

    expect(moveMarker(before, 'ayah-99-start', 1_000, DURATION_MS)).toEqual(before);
  });
});

describe('nudgeMarker', () => {
  it('applies a relative step', () => {
    const markers = nudgeMarker(buildMarkers(makeTimestamps()), 'ayah-2-start', -100, DURATION_MS);

    expect(markers.find((m) => m.id === 'ayah-2-start')?.ms).toBe(9_900);
  });

  it('accumulates repeated steps', () => {
    let markers = buildMarkers(makeTimestamps());
    for (let i = 0; i < 4; i++) markers = nudgeMarker(markers, 'ayah-2-start', 10, DURATION_MS);

    expect(markers.find((m) => m.id === 'ayah-2-start')?.ms).toBe(10_040);
  });

  it('stops at the neighbour instead of overshooting it', () => {
    const markers = nudgeMarker(buildMarkers(makeTimestamps()), 'ayah-2-end', 5_000, DURATION_MS);

    expect(markers.find((m) => m.id === 'ayah-2-end')?.ms).toBe(20_000 - MIN_MARKER_GAP_MS);
  });

  it('returns the list unchanged for an unknown marker', () => {
    const before = buildMarkers(makeTimestamps());

    expect(nudgeMarker(before, 'nope', 10, DURATION_MS)).toEqual(before);
  });
});

describe('markerDrift and hasUnsavedChanges', () => {
  it('reports how far a marker has travelled since loading', () => {
    const markers = nudgeMarker(buildMarkers(makeTimestamps()), 'ayah-2-start', -100, DURATION_MS);
    const moved = markers.find((m) => m.id === 'ayah-2-start') as EditorMarker;

    expect(markerDrift(moved)).toBe(-100);
  });

  it('reports zero drift for an untouched marker', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(markerDrift(markers[0])).toBe(0);
  });

  it('flags the list as dirty once any marker moves', () => {
    const markers = nudgeMarker(buildMarkers(makeTimestamps()), 'ayah-3-start', 10, DURATION_MS);

    expect(hasUnsavedChanges(markers)).toBe(true);
  });

  it('is clean again when a marker is nudged back to where it started', () => {
    let markers = nudgeMarker(buildMarkers(makeTimestamps()), 'ayah-3-start', 10, DURATION_MS);
    markers = nudgeMarker(markers, 'ayah-3-start', -10, DURATION_MS);

    expect(hasUnsavedChanges(markers)).toBe(false);
  });
});

describe('marker seeking', () => {
  it('finds the next marker after a position', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(markerAfter(markers, 9_500)?.id).toBe('ayah-2-start');
  });

  it('finds the previous marker before a position', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(markerBefore(markers, 9_500)?.id).toBe('ayah-1-end');
  });

  it('returns null past the last marker', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(markerAfter(markers, 59_000)).toBeNull();
  });

  it('returns null before the first marker', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(markerBefore(markers, 0)).toBeNull();
  });

  it('picks the closest marker for snap-to-playhead', () => {
    const markers = buildMarkers(makeTimestamps());

    expect(nearestMarker(markers, 9_400)?.id).toBe('ayah-1-end');
    expect(nearestMarker(markers, 9_900)?.id).toBe('ayah-2-start');
  });

  it('returns null when there are no markers at all', () => {
    expect(nearestMarker([], 1_000)).toBeNull();
  });
});

describe('validateMarkers', () => {
  it('passes a well-formed list', () => {
    expect(validateMarkers(buildMarkers(makeTimestamps()), DURATION_MS)).toEqual([]);
  });

  it('flags a marker beyond the end of the audio', () => {
    const markers = buildMarkers(
      makeTimestamps({ ayahs: [{ ayah: 1, start_ms: 0, end_ms: 90_000 }] })
    );

    expect(validateMarkers(markers, DURATION_MS)).toEqual([
      { markerId: 'ayah-1-end', reason: 'out-of-range' },
    ]);
  });

  it('flags loaded data whose ayahs overlap', () => {
    const markers = buildMarkers(
      makeTimestamps({
        surah: null,
        ayahs: [
          { ayah: 1, start_ms: 0, end_ms: 12_000 },
          { ayah: 2, start_ms: 10_000, end_ms: 19_000 },
        ],
      })
    );

    expect(
      validateMarkers(markers, DURATION_MS).some((i) => i.reason === 'crosses-neighbour')
    ).toBe(true);
  });

  it('flags an ayah with no measurable length', () => {
    const markers = buildMarkers(
      makeTimestamps({ surah: null, ayahs: [{ ayah: 1, start_ms: 5_000, end_ms: 5_002 }] })
    );

    expect(validateMarkers(markers, DURATION_MS)).toEqual([
      { markerId: 'ayah-1-end', reason: 'zero-length' },
    ]);
  });

  it('accepts an empty list rather than inventing an issue', () => {
    expect(validateMarkers([], DURATION_MS)).toEqual([]);
  });
});
