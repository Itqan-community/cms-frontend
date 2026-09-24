/** `gap` is a folded stretch of unchanged text (see `WordDiff.folded`). */
export type WordDiffKind = 'same' | 'added' | 'removed' | 'gap';

export interface WordDiffSegment {
  text: string;
  kind: WordDiffKind;
}

export interface WordDiff {
  /** The old text split into unchanged and removed runs. */
  before: WordDiffSegment[];
  /** The new text split into unchanged and added runs. */
  after: WordDiffSegment[];
  /**
   * The same diff with long unchanged stretches folded into `gap` segments,
   * keeping a few words of context around each change. A gap holds the text it
   * hides and appears on both sides at the same place. `null` when nothing
   * is long enough to fold.
   */
  folded: { before: WordDiffSegment[]; after: WordDiffSegment[] } | null;
}

/**
 * Most word/space edits we trace exactly. Work grows with the size of the edit,
 * not the text, so long texts with a few changes stay cheap; past this the
 * differing middle is shown as one removed run and one added run.
 */
const MAX_EDITS = 1_000;
/** Unchanged words kept on each side of a change in the folded view. */
const CONTEXT_WORDS = 6;
/** Shorter unchanged stretches stay visible — a "…" would save nothing. */
const MIN_FOLD_WORDS = 4;

interface Op {
  token: string;
  kind: 'same' | 'added' | 'removed';
}

/**
 * Word-level diff of two texts (Myers' shortest edit script over word and
 * whitespace tokens). Joining each side's segments reproduces its text exactly.
 */
export function diffWords(before: string, after: string): WordDiff {
  const a = tokenize(before);
  const b = tokenize(after);
  const ops = myers(a, b) ?? coarse(a, b);

  const hidden = foldMask(ops);
  return {
    ...build(ops, null),
    folded: hidden ? build(ops, hidden) : null,
  };
}

/** Split ops into the two sides; ops flagged in `hidden` merge into `gap` runs. */
function build(ops: Op[], hidden: boolean[] | null): Pick<WordDiff, 'before' | 'after'> {
  const before: WordDiffSegment[] = [];
  const after: WordDiffSegment[] = [];
  ops.forEach((op, k) => {
    const kind = hidden?.[k] ? 'gap' : op.kind;
    if (op.kind !== 'added') push(before, op.token, kind);
    if (op.kind !== 'removed') push(after, op.token, kind);
  });
  return { before, after };
}

/**
 * Which unchanged ops sit more than `CONTEXT_WORDS` words from every change,
 * in stretches of at least `MIN_FOLD_WORDS` words. `null` when none do.
 */
function foldMask(ops: Op[]): boolean[] | null {
  if (ops.every((op) => op.kind === 'same')) return null;
  const isWord = (op: Op) => op.kind === 'same' && /\S/.test(op.token);
  // Distance in words to the nearest change, looking backwards then forwards.
  const dist = ops.map(() => Infinity);
  for (const [start, step] of [
    [0, 1],
    [ops.length - 1, -1],
  ]) {
    let d = Infinity;
    for (let k = start; k >= 0 && k < ops.length; k += step) {
      if (ops[k].kind !== 'same') d = 0;
      else if (isWord(ops[k])) d++;
      dist[k] = Math.min(dist[k], d);
    }
  }

  const hidden = dist.map((d) => d > CONTEXT_WORDS);
  // Un-hide stretches too short to be worth a gap.
  let folds = false;
  for (let k = 0; k < ops.length; ) {
    if (!hidden[k]) {
      k++;
      continue;
    }
    let end = k;
    let count = 0;
    while (end < ops.length && hidden[end]) {
      if (isWord(ops[end])) count++;
      end++;
    }
    if (count < MIN_FOLD_WORDS) hidden.fill(false, k, end);
    else folds = true;
    k = end;
  }
  return folds ? hidden : null;
}

/**
 * Myers' O((N+M)·D) diff. Returns `null` when more than `MAX_EDITS` edits are
 * needed. `trace[d][k + d]` is the furthest x reached on diagonal k after d edits.
 */
function myers(a: string[], b: string[]): Op[] | null {
  const n = a.length;
  const m = b.length;
  const offset = Math.min(n + m, MAX_EDITS) + 1;
  const v = new Int32Array(2 * offset + 1);
  const trace: Int32Array[] = [];

  for (let d = 0; d <= n + m && d <= MAX_EDITS; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
          ? v[offset + k + 1]
          : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        trace.push(v.slice(offset - d, offset + d + 1));
        return backtrack(a, b, trace);
      }
    }
    trace.push(v.slice(offset - d, offset + d + 1));
  }
  return null;
}

function backtrack(a: string[], b: string[], trace: Int32Array[]): Op[] {
  const ops: Op[] = [];
  let x = a.length;
  let y = b.length;
  for (let d = trace.length - 1; d >= 0; d--) {
    const k = x - y;
    if (d === 0) {
      while (x > 0) ops.push({ token: a[--x], kind: 'same' });
      break;
    }
    const prev = trace[d - 1];
    const at = (diag: number) => prev[diag + d - 1];
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const prevK = down ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    const snakeStart = down ? prevX : prevX + 1;
    while (x > snakeStart) {
      ops.push({ token: a[--x], kind: 'same' });
      y--;
    }
    if (down) ops.push({ token: b[prevY], kind: 'added' });
    else ops.push({ token: a[prevX], kind: 'removed' });
    x = prevX;
    y = prevY;
  }
  return ops.reverse();
}

/** Fallback for near-total rewrites: common start and end kept, the middle replaced. */
function coarse(a: string[], b: string[]): Op[] {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++;
  }
  const same = (token: string): Op => ({ token, kind: 'same' });
  return [
    ...a.slice(0, head).map(same),
    ...a.slice(head, a.length - tail).map((token): Op => ({ token, kind: 'removed' })),
    ...b.slice(head, b.length - tail).map((token): Op => ({ token, kind: 'added' })),
    ...a.slice(a.length - tail).map(same),
  ];
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
