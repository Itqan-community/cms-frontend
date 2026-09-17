import type { WaveformPeaks } from './waveform-peaks.util';
import { PEAKS_RESOLUTION_PER_SECOND, computePeaks, peaksForWindow } from './waveform-peaks.util';

/** One second of a sine at `sampleRate`, scaled to `amplitude`. */
function tone(sampleRate: number, seconds: number, amplitude: number): Float32Array {
  const samples = new Float32Array(sampleRate * seconds);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin((i / sampleRate) * Math.PI * 2 * 440) * amplitude;
  }
  return samples;
}

/** Loud for the first half, silent for the second — a crude "ayah then pause". */
function toneThenSilence(sampleRate: number, seconds: number): Float32Array {
  const samples = tone(sampleRate, seconds, 1);
  samples.fill(0, samples.length / 2);
  return samples;
}

function makePeaks(data: number[], resolution = PEAKS_RESOLUTION_PER_SECOND): WaveformPeaks {
  return {
    data: Float32Array.from(data),
    resolution,
    durationMs: ((data.length / 2) * 1_000) / resolution,
  };
}

describe('computePeaks', () => {
  it('produces one min/max pair per bucket', () => {
    const peaks = computePeaks(tone(8_000, 1, 1), 8_000, 100);

    expect(peaks.length).toBe(200);
  });

  it('brackets the signal between its floor and ceiling', () => {
    const peaks = computePeaks(tone(8_000, 1, 0.5), 8_000, 100);

    expect(peaks[0] < 0).toBe(true);
    expect(peaks[1] > 0).toBe(true);
    expect(Math.abs(peaks[1]) <= 0.5).toBe(true);
  });

  it('reports silence as a flat bucket — this is what makes a pause visible', () => {
    const peaks = computePeaks(toneThenSilence(8_000, 1), 8_000, 100);
    const lastBucket = peaks.length / 2 - 1;

    expect(peaks[lastBucket * 2]).toBe(0);
    expect(peaks[lastBucket * 2 + 1]).toBe(0);
  });

  it('scales the bucket count with the requested resolution', () => {
    const coarse = computePeaks(tone(8_000, 1, 1), 8_000, 10);
    const fine = computePeaks(tone(8_000, 1, 1), 8_000, 100);

    expect(coarse.length).toBe(20);
    expect(fine.length).toBe(200);
  });

  it('keeps a trailing partial bucket rather than dropping the tail', () => {
    const samples = new Float32Array(8_050);
    samples.fill(0.5);

    const peaks = computePeaks(samples, 8_000, 100);

    expect(peaks.length).toBe(202);
  });

  it('returns an empty result for empty audio', () => {
    expect(computePeaks(new Float32Array(0), 8_000, 100).length).toBe(0);
  });

  it('never buckets fewer than one sample, even at absurd resolutions', () => {
    const peaks = computePeaks(tone(8_000, 1, 1), 8_000, 100_000);

    expect(peaks.length).toBe(16_000);
  });
});

describe('peaksForWindow', () => {
  it('returns two values per requested column', () => {
    const peaks = makePeaks([-1, 1, -0.5, 0.5, -0.2, 0.2, 0, 0]);

    expect(peaksForWindow(peaks, 0, 40, 4).length).toBe(8);
  });

  it('keeps the loudest extremes when many buckets collapse into one column', () => {
    const peaks = makePeaks([-0.2, 0.2, -1, 1, -0.3, 0.3, -0.1, 0.1]);

    const column = peaksForWindow(peaks, 0, 40, 1);

    expect(column[0]).toBe(-1);
    expect(column[1]).toBe(1);
  });

  it('reads only the requested window, not the whole track', () => {
    const peaks = makePeaks([-1, 1, -0.1, 0.1, -0.1, 0.1, -0.1, 0.1]);

    const column = peaksForWindow(peaks, 10, 40, 1);

    // Float32 storage, so compare with tolerance rather than for identity.
    expect(column[0]).toBeCloseTo(-0.1, 5);
  });

  it('stretches a window narrower than the cache instead of inventing detail', () => {
    const peaks = makePeaks([-1, 1, -0.5, 0.5]);

    const columns = peaksForWindow(peaks, 0, 10, 4);

    expect(columns.length).toBe(8);
    expect(columns[0]).toBe(-1);
  });

  it('draws a zero-width window as silence, keeping the column count the caller asked for', () => {
    const columns = peaksForWindow(makePeaks([-1, 1]), 10, 10, 4);

    expect(columns.length).toBe(8);
    expect([...columns].every((v) => v === 0)).toBe(true);
  });

  it('returns an empty result when no columns are asked for', () => {
    expect(peaksForWindow(makePeaks([-1, 1]), 0, 10, 0).length).toBe(0);
  });

  it('clamps a window that runs past the end of the audio', () => {
    const peaks = makePeaks([-1, 1, -0.5, 0.5]);

    const columns = peaksForWindow(peaks, 0, 1_000, 2);

    expect(columns.length).toBe(4);
    expect(Number.isFinite(columns[0])).toBe(true);
  });
});
