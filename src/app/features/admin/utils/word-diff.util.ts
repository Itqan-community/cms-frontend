export type WordDiffKind = 'same' | 'added' | 'removed';

export interface WordDiffSegment {
  text: string;
  kind: WordDiffKind;
}

export interface WordDiff {
  /** The old text split into unchanged and removed runs. */
  before: WordDiffSegment[];
  /** The new text split into unchanged and added runs. */
  after: WordDiffSegment[];
}

/** Largest LCS table we build (tokens × tokens); beyond it the caller shows plain text. */
const MAX_CELLS = 1_000_000;

/**
 * Word-level diff of two texts (longest common subsequence over word and
 * whitespace tokens). Joining each side's segments reproduces its text exactly.
 * Returns `null` when the texts are too long to compare cheaply.
 */
export function diffWords(before: string, after: string): WordDiff | null {
  const a = tokenize(before);
  const b = tokenize(after);
  if ((a.length + 1) * (b.length + 1) > MAX_CELLS) return null;

  // lcs[i * cols + j] = LCS length of a[i..] and b[j..].
  const cols = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * cols);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * cols + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * cols + j + 1] + 1
          : Math.max(lcs[(i + 1) * cols + j], lcs[i * cols + j + 1]);
    }
  }

  const beforeSegs: WordDiffSegment[] = [];
  const afterSegs: WordDiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      push(beforeSegs, a[i++], 'same');
      push(afterSegs, b[j++], 'same');
    } else if (
      j < b.length &&
      (i === a.length || lcs[i * cols + j + 1] >= lcs[(i + 1) * cols + j])
    ) {
      push(afterSegs, b[j++], 'added');
    } else {
      push(beforeSegs, a[i++], 'removed');
    }
  }
  return { before: beforeSegs, after: afterSegs };
}

function tokenize(text: string): string[] {
  return text.match(/\s+|\S+/g) ?? [];
}

/** Append a token, merging it into the previous run when the kind matches. */
function push(segments: WordDiffSegment[], token: string, kind: WordDiffKind): void {
  const last = segments[segments.length - 1];
  if (last && last.kind === kind) {
    last.text += token;
  } else {
    segments.push({ text: token, kind });
  }
}
