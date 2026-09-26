/**
 * Waveform peak extraction.
 *
 * A murattal recording of a long surah runs to two hours. Decoded at the source rate that is
 * billions of samples held in the tab, so the decode is done into a low-rate mono context and
 * the audio buffer is released as soon as peaks are computed — the peaks themselves are a few
 * megabytes and are all the drawing ever needs.
 *
 * Playback does not go through here: the editor plays a plain `HTMLAudioElement`, which streams
 * and decodes nothing up front.
 */

/** Mono decode rate. Detail below this is invisible at any zoom the editor offers. */
export const DECODE_SAMPLE_RATE = 8_000;

/** Buckets per second in the cached peaks — 10 ms per bucket. */
export const PEAKS_RESOLUTION_PER_SECOND = 100;

/** Past this the page warns before decoding and offers a marker-only timeline instead. */
export const LARGE_TRACK_MS = 40 * 60 * 1_000;

/** Interleaved min/max pairs in [-1, 1]; `data[2n]` is a bucket's floor, `data[2n+1]` its ceiling. */
export interface WaveformPeaks {
  durationMs: number;
  resolution: number;
  data: Float32Array;
}

/** The quietest and loudest sample in a span of audio. */
interface Extremes {
  min: number;
  max: number;
}

/** An inclusive slice of the cached bucket array. */
interface BucketRange {
  first: number;
  last: number;
}

/** Raised when the audio host does not allow cross-origin reads — the CORS pre-flight case. */
export class WaveformFetchError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'decode'
  ) {
    super(message);
    this.name = 'WaveformFetchError';
  }
}

/**
 * Fetches and decodes a track into cached peaks.
 *
 * Requires `Access-Control-Allow-Origin` on the audio host: an `<audio>` element plays a
 * cross-origin file happily, but reading its bytes for decoding does not.
 */
export async function loadWaveformPeaks(
  url: string,
  options: { signal?: AbortSignal; resolution?: number } = {}
): Promise<WaveformPeaks> {
  const resolution = options.resolution ?? PEAKS_RESOLUTION_PER_SECOND;
  const encoded = await fetchAudioBytes(url, options.signal);

  // `decodeAudioData` cannot be interrupted, but the caller may have navigated away while it
  // ran. Checking on both sides of it keeps an abandoned load from scanning every sample of a
  // two-hour surah and from resolving with a result nothing is waiting for.
  options.signal?.throwIfAborted();
  const buffer = await decodeToLowRateMono(encoded);
  options.signal?.throwIfAborted();

  return {
    durationMs: Math.round(buffer.duration * 1_000),
    resolution,
    data: computePeaks(buffer.getChannelData(0), buffer.sampleRate, resolution),
  };
}

/** Buckets raw samples into min/max pairs. Pure, so the bucketing maths is testable. */
export function computePeaks(
  samples: Float32Array,
  sampleRate: number,
  resolution: number
): Float32Array {
  const samplesPerBucket = Math.max(1, Math.round(sampleRate / resolution));
  const bucketCount = Math.ceil(samples.length / samplesPerBucket);
  const peaks = new Float32Array(bucketCount * 2);

  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const from = bucket * samplesPerBucket;
    const to = Math.min(from + samplesPerBucket, samples.length);

    writeExtremes(peaks, bucket, extremesOfSamples(samples, from, to));
  }

  return peaks;
}

/**
 * Re-buckets cached peaks onto a pixel column range — how zoom works without decoding again.
 * A window narrower than the cache simply stretches it; no new detail exists to recover.
 *
 * Always returns exactly `columns` pairs so the renderer never has to special-case a short
 * result: a degenerate window comes back as silence rather than as an empty array.
 */
export function peaksForWindow(
  peaks: WaveformPeaks,
  startMs: number,
  endMs: number,
  columns: number
): Float32Array {
  const out = new Float32Array(Math.max(0, columns) * 2);
  if (columns <= 0 || endMs <= startMs) return out;

  const edgeMs = (column: number) => startMs + ((endMs - startMs) * column) / columns;

  for (let column = 0; column < columns; column++) {
    const range = bucketRangeFor(peaks, edgeMs(column), edgeMs(column + 1));

    writeExtremes(out, column, extremesOfBuckets(peaks.data, range));
  }

  return out;
}

// --- loading ---

async function fetchAudioBytes(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new WaveformFetchError(`Audio request failed with ${response.status}`, 'network');
    }

    return await response.arrayBuffer();
  } catch (error) {
    if (error instanceof WaveformFetchError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw error;

    throw new WaveformFetchError('Could not read the audio file', 'network');
  }
}

async function decodeToLowRateMono(encoded: ArrayBuffer): Promise<AudioBuffer> {
  // A one-frame context is enough: decodeAudioData resamples to the context rate, which is the
  // whole point — it is what keeps a two-hour surah inside a sane memory budget.
  const context = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE);

  try {
    return await context.decodeAudioData(encoded);
  } catch {
    throw new WaveformFetchError('Could not decode the audio file', 'decode');
  }
}

// --- scanning ---

/**
 * Indexed scan rather than `reduce`: this runs over every decoded sample — some 57 million of
 * them for a two-hour surah — where the declarative equivalents allocate per sample and undo
 * the memory budget this whole module exists to protect.
 */
function extremesOfSamples(samples: Float32Array, from: number, to: number): Extremes {
  let min = 0;
  let max = 0;

  for (let i = from; i < to; i++) {
    const value = samples[i];
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return { min, max };
}

/** Same reasoning as `extremesOfSamples`, one level up: this runs per rendered pixel column. */
function extremesOfBuckets(data: Float32Array, { first, last }: BucketRange): Extremes {
  let min = 0;
  let max = 0;

  for (let bucket = first; bucket <= last; bucket++) {
    if (data[bucket * 2] < min) min = data[bucket * 2];
    if (data[bucket * 2 + 1] > max) max = data[bucket * 2 + 1];
  }

  return { min, max };
}

function bucketRangeFor(peaks: WaveformPeaks, fromMs: number, toMs: number): BucketRange {
  const msPerBucket = 1_000 / peaks.resolution;
  const lastBucket = peaks.data.length / 2 - 1;

  return {
    first: Math.max(0, Math.floor(fromMs / msPerBucket)),
    last: Math.min(lastBucket, Math.ceil(toMs / msPerBucket) - 1),
  };
}

function writeExtremes(target: Float32Array, index: number, { min, max }: Extremes): void {
  target[index * 2] = min;
  target[index * 2 + 1] = max;
}
