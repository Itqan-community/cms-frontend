import type { WordDiff, WordDiffSegment } from './word-diff.util';

/**
 * Characters of one side of a change shown inline before it is cut off with
 * "…". A whole uploaded language or a rewritten tafsir entry would otherwise
 * fill the list; the full text is one click away in the "Show full text" popup.
 */
export const PREVIEW_CHARS = 300;

/** Cut `text` to about `max` characters, at a word boundary when one is near. */
export function clipText(text: string, max = PREVIEW_CHARS): { text: string; clipped: boolean } {
  if (text.length <= max) return { text, clipped: false };
  return { text: cutAtWord(text, max), clipped: true };
}

/**
 * Keep the segments of a word diff until about `max` characters are shown, then
 * end with one `gap` segment (rendered as "…"). Gaps already in `segments` (folded
 * unchanged text) take no room, so a huge added or removed run is cut too.
 */
export function clipSegments(
  segments: WordDiffSegment[],
  max = PREVIEW_CHARS
): { segments: WordDiffSegment[]; clipped: boolean } {
  const out: WordDiffSegment[] = [];
  let used = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.kind === 'gap') {
      out.push(seg);
      continue;
    }
    if (used + seg.text.length <= max) {
      out.push(seg);
      used += seg.text.length;
      continue;
    }
    const kept = cutAtWord(seg.text, max - used);
    if (kept) out.push({ text: kept, kind: seg.kind });
    const hidden =
      seg.text.slice(kept.length) +
      segments
        .slice(i + 1)
        .map((s) => s.text)
        .join('');
    out.push({ text: hidden, kind: 'gap' });
    return { segments: out, clipped: true };
  }
  return { segments: out, clipped: false };
}

/** Whether a change is shown cut short inline, so "Show full text" applies. */
export function isPreviewCut(before: string, after: string, words: WordDiff | null): boolean {
  return !!words?.folded || before.length > PREVIEW_CHARS || after.length > PREVIEW_CHARS;
}

function cutAtWord(text: string, max: number): string {
  if (max <= 0) return '';
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  // Prefer a word boundary unless that would throw away most of the room.
  return space > max * 0.6 ? cut.slice(0, space) : cut;
}
