#!/usr/bin/env node
/**
 * Generates ayah timing JSON files for the "تزمين الآيات" upload, so the full cycle
 * (upload → editor loads → drag → save) can be exercised without waiting on real timing data.
 *
 * The body matches `serializeTimingFile` in
 * `src/app/features/admin/audio/services/audio-timestamps.service.ts`, so a generated file is
 * byte-shape-identical to what a save writes back.
 *
 * Bounds go out as **seconds** (`start` / `end`), because the ingest multiplies them by 1000.
 * Every flag below is still given in milliseconds; the conversion happens at the last step.
 *
 * Ayah counts come from the app's own SURAHS_METADATA, so a surah always gets its real count.
 *
 *   node scripts/generate-ayah-timing.mjs --surah 1 --duration 52.4
 *   node scripts/generate-ayah-timing.mjs --surah 114 --duration 00:41 --stem 114
 *   node scripts/generate-ayah-timing.mjs --surah 1,112,113,114 --duration 40
 *
 * Flags:
 *   --surah <n[,n...]>  Surah number(s). Required.
 *   --duration <d>      Audio length per surah: seconds ("52.4"), "mm:ss", or "52400ms".
 *   --stem <name>       Output basename, no extension. Defaults to the padded surah ("001").
 *                       Convention only — the ingest matches on `surah_id` in the body, not on
 *                       the name — but following the audio stem keeps the bucket readable.
 *   --out <dir>         Output directory. Default: tmp/timings (gitignored).
 *   --lead <d>          Silence before ayah 1. Default 400ms.
 *   --tail <d>          Silence after the last ayah. Default 600ms.
 *   --gap <d>           Pause between consecutive ayahs. Default 250ms.
 *   --no-surah-bounds   Omit the `surah` object (exercises the ayah-bounds-only branch).
 *   --keyed             One recitation-wide file keyed by surah number. Reader-side only: the
 *                       ingest wants a flat body with `surah_id`, so a keyed file is rejected
 *                       with `Missing surah_id in uploaded JSON`. Use it to test `load`, not
 *                       the upload.
 *   --invalid <kind>    Emit deliberately broken data to exercise validateMarkers:
 *                       overlap | zero-length | out-of-range
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const METADATA_PATH = 'src/app/features/admin/models/quran-metadata.ts';

/** Two boundaries may never land closer than this — mirrors MIN_MARKER_GAP_MS. */
const MIN_MARKER_GAP_MS = 10;

/** Milliseconds → the seconds the ingest wants, at millisecond precision. */
function toSeconds(ms) {
  return Number((ms / 1000).toFixed(3));
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

// --- args ---

function parseArgs(argv) {
  const flags = { out: 'tmp/timings', lead: '400ms', tail: '600ms', gap: '250ms' };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) fail(`unexpected argument "${arg}"`);
    const key = arg.slice(2);

    if (key === 'keyed' || key === 'no-surah-bounds') {
      flags[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value == null || value.startsWith('--')) fail(`--${key} needs a value`);
    flags[key] = value;
    i += 1;
  }

  return flags;
}

/** Accepts "52.4" (s), "mm:ss", or "52400ms" — all the ways a duration gets quoted. */
function parseDuration(raw, label) {
  const text = String(raw).trim();

  if (/^\d+ms$/.test(text)) return Number(text.slice(0, -2));
  if (/^\d+:\d{1,2}(\.\d+)?$/.test(text)) {
    const [minutes, seconds] = text.split(':');
    return Math.round((Number(minutes) * 60 + Number(seconds)) * 1000);
  }
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * 1000);

  return fail(`could not read ${label} "${raw}" — use seconds, mm:ss, or <n>ms`);
}

// --- surah metadata, read from the app's own source of truth ---

function loadAyahCounts() {
  const source = readFileSync(resolve(METADATA_PATH), 'utf8');
  const counts = new Map();

  for (const line of source.split('\n')) {
    const match = line.match(/\{\s*id:\s*(\d+),.*?ayahs:\s*(\d+)\s*\}/);
    if (match) counts.set(Number(match[1]), Number(match[2]));
  }

  if (counts.size !== 114) fail(`read ${counts.size} surahs from ${METADATA_PATH}, expected 114`);
  return counts;
}

// --- timing construction ---

/**
 * Spreads `ayahCount` ayahs across the playable window, giving every ayah the same length and
 * putting `gap` of silence between them. Even spacing is not realistic recitation, but it is
 * predictable, which is what makes a drag in the editor easy to verify.
 */
function buildAyahs(ayahCount, durationMs, { lead, tail, gap }) {
  const playable = durationMs - lead - tail;
  const totalGaps = gap * (ayahCount - 1);
  const perAyah = Math.floor((playable - totalGaps) / ayahCount);

  if (perAyah < MIN_MARKER_GAP_MS) {
    fail(
      `duration ${durationMs}ms is too short for ${ayahCount} ayahs ` +
        `(lead ${lead} + tail ${tail} + gaps ${totalGaps} leaves ${perAyah}ms each)`
    );
  }

  // Wire names are `ayah_number` / `start` / `end`, and the bounds are **seconds** — the ingest
  // multiplies by 1000 (uploading `start: 400` stored `start_ms: 400000`). Everything above is
  // computed in milliseconds, so the conversion happens here, at the edge.
  return Array.from({ length: ayahCount }, (_, index) => {
    const start = lead + index * (perAyah + gap);
    return { ayah_number: index + 1, start: toSeconds(start), end: toSeconds(start + perAyah) };
  });
}

/** Breaks the data in one specific documented way, to see the editor's pre-save report. */
function corrupt(ayahs, kind, durationMs) {
  const copy = ayahs.map((a) => ({ ...a }));
  if (copy.length < 2) fail(`--invalid needs a surah with at least 2 ayahs`);
  // Entries are in seconds by this point, so the offsets below are too.

  if (kind === 'overlap') {
    // Ayah 2 starts before ayah 1 ends → 'crosses-neighbour'.
    copy[1].start = copy[0].end - 0.5;
    return copy;
  }

  if (kind === 'zero-length') {
    copy[1].end = copy[1].start;
    return copy;
  }
  if (kind === 'out-of-range') {
    copy[copy.length - 1].end = toSeconds(durationMs) + 5;
    return copy;
  }

  return fail(`unknown --invalid "${kind}" — use overlap, zero-length, or out-of-range`);
}

function buildBody(surah, ayahCount, durationMs, flags, spacing) {
  let ayahs = buildAyahs(ayahCount, durationMs, spacing);
  if (flags.invalid) ayahs = corrupt(ayahs, flags.invalid, durationMs);

  // `surah_id`, not `surah_number`: the ingest rejects a file without it with
  // `Missing surah_id in uploaded JSON`.
  const body = { surah_id: surah, ayahs };

  if (!flags['no-surah-bounds']) {
    // The recitation may open before ayah 1 and close after the last — surah bounds wrap the
    // ayah chain rather than sitting inside it.
    body.surah = { start: toSeconds(spacing.lead), end: toSeconds(durationMs - spacing.tail) };
  }

  return body;
}

// --- main ---

const flags = parseArgs(process.argv.slice(2));

if (!flags.surah) fail('--surah is required (e.g. --surah 1, or --surah 1,112,113,114)');
if (!flags.duration) fail('--duration is required (e.g. --duration 52.4, "00:52", or 52400ms)');

const ayahCounts = loadAyahCounts();
const surahs = String(flags.surah)
  .split(',')
  .map((part) => {
    const n = Number(part.trim());
    if (!Number.isInteger(n) || n < 1 || n > 114) fail(`"${part.trim()}" is not a surah number`);
    return n;
  });

if (flags.stem && surahs.length > 1 && !flags.keyed) {
  fail('--stem names one file; use it with a single --surah, or add --keyed');
}

const durationMs = parseDuration(flags.duration, '--duration');
const spacing = {
  lead: parseDuration(flags.lead, '--lead'),
  tail: parseDuration(flags.tail, '--tail'),
  gap: parseDuration(flags.gap, '--gap'),
};

if (spacing.lead + spacing.tail >= durationMs) {
  fail(`--lead + --tail (${spacing.lead + spacing.tail}ms) must be under --duration`);
}

const outDir = resolve(flags.out);
mkdirSync(outDir, { recursive: true });

const bodies = surahs.map((surah) => ({
  surah,
  ayahCount: ayahCounts.get(surah),
  body: buildBody(surah, ayahCounts.get(surah), durationMs, flags, spacing),
}));

const written = [];

if (flags.keyed) {
  // The recitation-wide layout `parseTimingFile` narrows by surah number.
  const keyed = Object.fromEntries(bodies.map(({ surah, body }) => [String(surah), body]));
  console.warn('warning: --keyed has no top-level surah_id; the upload ingest will reject it.\n');
  const name = `${flags.stem ?? 'timings'}.json`;
  writeFileSync(join(outDir, name), `${JSON.stringify(keyed, null, 2)}\n`);
  written.push({ name, surahs: bodies.map((b) => b.surah), ayahs: bodies[0].ayahCount });
} else {
  for (const { surah, ayahCount, body } of bodies) {
    const name = `${flags.stem ?? String(surah).padStart(3, '0')}.json`;
    writeFileSync(join(outDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push({ name, surahs: [surah], ayahs: ayahCount });
  }
}

const seconds = (ms) => `${(ms / 1000).toFixed(2)}s`;

console.log(`wrote ${written.length} file(s) to ${outDir}\n`);
for (const entry of written) {
  const label =
    entry.surahs.length > 1 ? `surahs ${entry.surahs.join(', ')}` : `surah ${entry.surahs[0]}`;
  console.log(`  ${entry.name}  ${label}, ${entry.ayahs} ayahs, track ${seconds(durationMs)}`);
}
if (flags.invalid) console.log(`\n  ⚠ deliberately invalid: ${flags.invalid}`);
console.log(`
Next: Recitation detail → "تزمين الآيات" → Choose JSON files → Upload timings.
The ingest matches on surah_id in the body — a surah number, never a track id. A wrong one comes
back as missing_tracks: [that value]. The filename follows the audio stem by convention only.`);
