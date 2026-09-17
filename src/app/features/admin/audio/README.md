# Ayah Timestamp Editor

Admin tool for correcting the millisecond boundaries that say where each ayah begins and ends inside
a recitation track.

**The audio file is never modified.** It is fetched, played and drawn — never written. What this
feature edits is a separate list of numbers beside the audio:

```
ayah 1  →  starts at      0 ms, ends at  12,480 ms
ayah 2  →  starts at 12,480 ms, ends at  19,115 ms
```

Downstream apps consume those numbers to highlight the ayah as it is recited, to jump playback to a
tapped ayah, and to repeat one ayah. If they drift, the highlight lags the voice for the whole surah
— in every app that consumes the asset.

The closest analogy is a subtitle timing editor: you do not re-cut the film, you drag the caption
until it lines up with the mouth.

---

## Where it lives

|             |                                                                               |
| ----------- | ----------------------------------------------------------------------------- |
| Route       | `/admin/audio/timestamps/:trackId?recitation=<slug>&folder=<folder>`          |
| Permission  | `portal_upload_timing` (`PORTAL_PERMISSIONS.PORTAL_UPLOAD_TIMING`)            |
| Entry point | "Edit timestamps" action on each row of the tracks table in Recitation Detail |
| Guards      | `permissionGuard` on activate, `timestampEditorCanDeactivate` on leave        |

`recitation` is a **required** query param: the track is looked up through the recitation-scoped
tracks endpoint, so the slug has to travel with the link. Opening the route without it shows a "open
this from the recitation page" error rather than failing silently.

---

## Architecture

Three layers. Dependencies point inward only, and each is testable without the one above it.

```
utils/waveform-geometry.util.ts     pure numbers — no DOM, no Angular
        ↑
waveform-renderer.ts                a 2D context + a scene — no Angular
        ↑
waveform-canvas.component.ts        Angular glue: inputs, outputs, resize, pointer
        ↑
timestamp-editor.component.ts       owns the rules and the API
```

### The rule that keeps the canvas reusable

**The canvas proposes, the page disposes.** A drag emits the raw millisecond under the pointer; the
parent decides whether that move is legal:

```ts
onMarkerDragged({ markerId, ms }: MarkerDragEvent): void {
  this.markers.update((m) => moveMarker(m, markerId, ms, this.durationMs()));
}
```

Clamping a marker against its neighbours is a decision about _ayah boundaries_, which is not a
waveform widget's business. Keep it that way — it is why the same component could render any
timeline.

### Files

| File                                                      | Responsibility                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| `models/audio-timestamps.models.ts`                       | `AyahTimestamp`, `SurahBounds`, `TrackTimestamps`, `EditorMarker` |
| `services/audio-timestamps.service.ts`                    | **The only place an HTTP call appears.** Load + save              |
| `utils/timestamp-markers.util.ts`                         | Marker rules: build, apply, move, nudge, validate                 |
| `utils/waveform-peaks.util.ts`                            | Fetch → decode → peak buckets, and re-bucketing for zoom          |
| `utils/waveform-geometry.util.ts`                         | Time ↔ pixels, hit-testing, zoom/pan                             |
| `utils/timestamp-format.util.ts`                          | `hh:mm:ss.mmm`, signed drift, nudge labels                        |
| `utils/audio-playback.ts`                                 | Playback state over a narrow `PlayableMedia` interface            |
| `components/waveform-canvas/waveform-renderer.ts`         | Scene → pixels                                                    |
| `components/waveform-canvas/waveform-canvas.component.ts` | Canvas element, resize, pointer events                            |
| `components/timestamp-editor/`                            | The page: state, API, keyboard, save                              |

---

## Reading the waveform

| What you see                | What it means                   |
| --------------------------- | ------------------------------- |
| Numbered cap at the **top** | An ayah **opens** here          |
| Pill at the **bottom**      | An ayah **closes** here         |
| Shaded stripe between them  | The **pause** between two ayahs |
| Amber marker + halo         | Currently selected              |
| Red line with a foot        | Playhead                        |

Opens and closes anchor to opposite edges deliberately: two adjacent stems a pause apart would
otherwise be indistinguishable. The pause shading is not decoration — reciters pause between ayahs,
so a correct boundary lands _inside_ a shaded band, and one sitting outside is visibly suspect.

## Keyboard

| Key              | Action                                 |
| ---------------- | -------------------------------------- |
| `Space`          | Play / pause                           |
| `←` `→`          | Seek ∓1 s (`Shift` for 5 s)            |
| `[` `]`          | Previous / next boundary               |
| `,` `.`          | Nudge selected boundary ∓10 ms         |
| `<` `>`          | Nudge ∓100 ms                          |
| `Enter`          | Snap selected boundary to the playhead |
| `⌘`/`Ctrl` + `S` | Save                                   |
| `Esc`            | Deselect                               |

**Arrow keys map to earlier/later in time, never to visual direction.** The admin panel runs RTL in
Arabic; flipping them with the layout would invert their meaning mid-session. For the same reason
the waveform and the transport controls are pinned `direction: ltr` — time runs left to right in
every locale.

---

## Decoding: why it is not naive

A murattal recording of a long surah runs to two hours. Decoded at source rate that is roughly **2.5
GB** of PCM in a browser tab, so `waveform-peaks.util.ts`:

1. Decodes through `OfflineAudioContext(1, 1, 8000)` — browsers resample to the context rate, so a
   two-hour surah lands near 230 MB instead.
2. Buckets peaks at `PEAKS_RESOLUTION_PER_SECOND` (100/sec, ~5.8 MB for two hours).
3. **Releases the `AudioBuffer` immediately.** Zoom re-buckets from the cached peaks and never
   decodes again.
4. Refuses tracks over `LARGE_TRACK_MS` (40 min), showing a marker-only timeline instead.

Playback never goes through any of this — it uses a plain `HTMLAudioElement`, which streams.

### CORS is a hard requirement for the waveform

`fetch()` on the audio URL needs `Access-Control-Allow-Origin` on the bucket. An `<audio>` element
plays a cross-origin file happily; **reading its bytes to decode does not.** Without the header you
get playback, markers and editing, but a flat timeline and an info banner instead of a trace.

If the trace is missing, `curl -I` the `audio_url` before looking anywhere else.

---

## Failure is non-fatal by design

Each of these degrades rather than blocking the session:

| Failure                                 | Result                                                 |
| --------------------------------------- | ------------------------------------------------------ |
| Timestamps fail to load                 | Audio still plays; warning banner; no markers          |
| Waveform cannot be decoded (CORS, size) | Flat timeline; markers stay fully editable             |
| Loaded data has overlapping ayahs       | Issue banner listing the count; nothing auto-corrected |

Loaded data is validated but never silently repaired — `validateMarkers` reports overlaps,
out-of-range and zero-length boundaries so an admin sees the fault rather than inheriting it.

---

## Backend contract — UNCONFIRMED

`audio-timestamps.service.ts` currently calls `${ADMIN_API_BASE_URL}/audio/timestamps/`. This is a
placeholder following the portal convention. Three questions are open:

1. Is the save path `…/portal/audio/timestamps/`, or something else?
2. Is there a GET, or should the editor read `ayah_timings_url` — the JSON file the existing
   `POST /portal/timing/upload/` flow already produces?
3. Does the payload replace a whole track, or patch individual boundaries?

Until they are answered the load call fails and the editor shows its warning banner. **Answering
them is a one-file change** — no component touches HTTP.

---

## Testing

```bash
npx ng test --watch=false --browsers=ChromeHeadless --include='**/audio/**/*.spec.ts'
```

Most of the logic is pure and tested without a DOM. `WaveformRenderer` takes a context rather than
finding one, so its tests drive it with a stub object and assert on recorded `fillRect` calls — no
fixture, no screenshots.

### Looking at the waveform

Visual changes should be _looked at_, not guessed. Bundle the real renderer and screenshot it:

```bash
npx esbuild src/app/features/admin/audio/components/waveform-canvas/waveform-renderer.ts \
  --bundle --format=esm --outfile=/tmp/viz/bundle.js
# serve /tmp/viz, then:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --force-device-scale-factor=2 --screenshot=/tmp/viz/shot.png \
  --window-size=1200,460 --virtual-time-budget=4000 "http://localhost:8765/harness.html"
```

The harness is a small HTML page that imports the bundle, builds fake peaks and markers, and calls
`renderer.draw()`. Two bugs were caught this way that every unit test passed: a washed-out band
tint, and labels positioned by padding instead of centred.

---

## Constants worth knowing

| Constant                  | Value                | Why                                                 |
| ------------------------- | -------------------- | --------------------------------------------------- |
| `MIN_MARKER_GAP_MS`       | 10                   | A zero-length ayah is not editable                  |
| `NUDGE_STEPS_MS`          | −100, −10, +10, +100 | The precision controls                              |
| `MIN_VIEW_MS`             | 200                  | Tightest zoom                                       |
| `MARKER_HIT_TOLERANCE_PX` | 8                    | Grab radius, matched to stem width                  |
| `DECODE_SAMPLE_RATE`      | 8000                 | Mono; finer detail is invisible at any zoom offered |
| `LARGE_TRACK_MS`          | 40 min               | Above this, no waveform is attempted                |

---

## Not built yet

- **Word-level boundaries.** Deferred deliberately: a mushaf has ~77,400 word boundaries against
  6,236 ayah boundaries, so hand-editing is coherent at ayah level and not at word level. Word
  markers belong here as _spot_ correction, needing a virtualized overlay and ayah-scoped zoom.
- **Suspect-boundary triage.** The peak data already computed can score each boundary by the audio
  energy around it — a boundary sitting in loud audio is probably drift. That turns a two-hour scrub
  into a twenty-marker review, and rolls up into a per-recitation quality score.
- **Undo.** `markerReleased` is emitted by the canvas and currently unused; it is the natural hook
  for committing a drag as a single undo step.
