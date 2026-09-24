import { diffWords } from './word-diff.util';

describe('diffWords', () => {
  it('marks removed words on the before side and added words on the after side', () => {
    const result = diffWords('In the name of God', 'In the name of Allah');

    expect(result.before).toEqual([
      { text: 'In the name of ', kind: 'same' },
      { text: 'God', kind: 'removed' },
    ]);
    expect(result.after).toEqual([
      { text: 'In the name of ', kind: 'same' },
      { text: 'Allah', kind: 'added' },
    ]);
  });

  it('handles Arabic text and insertions in the middle', () => {
    const result = diffWords('بسم الله الرحيم', 'بسم الله الرحمن الرحيم');

    expect(result.before.every((s) => s.kind === 'same')).toBeTrue();
    expect(result.after.filter((s) => s.kind === 'added').map((s) => s.text.trim())).toEqual([
      'الرحمن',
    ]);
  });

  it('rebuilds each side exactly from its segments', () => {
    const before = 'one  two\nthree';
    const after = 'one two\nthree four';

    const result = diffWords(before, after);

    expect(result.before.map((s) => s.text).join('')).toBe(before);
    expect(result.after.map((s) => s.text).join('')).toBe(after);
  });

  it('highlights edits in a very long single-line text and folds the rest', () => {
    const words = Array.from({ length: 3000 }, (_, i) => `w${i}`);
    const before = words.join(' ');
    const edited = [...words];
    edited[100] = 'CHANGED';
    edited[2900] = 'ALSO';
    const after = edited.join(' ');

    const result = diffWords(before, after);

    expect(result.after.filter((s) => s.kind === 'added').map((s) => s.text)).toEqual([
      'CHANGED',
      'ALSO',
    ]);
    expect(result.before.filter((s) => s.kind === 'removed').map((s) => s.text)).toEqual([
      'w100',
      'w2900',
    ]);
    expect(result.folded!.after.map((s) => s.kind)).toEqual([
      'gap',
      'same',
      'added',
      'same',
      'gap',
      'same',
      'added',
      'same',
      'gap',
    ]);
  });

  it('still marks the differing middle when the texts barely overlap', () => {
    const before = Array.from({ length: 3000 }, (_, i) => `a${i}`).join(' ');
    const after = Array.from({ length: 3000 }, (_, i) => `b${i}`).join(' ');

    const result = diffWords(`start ${before} end`, `start ${after} end`);

    expect(result.before.map((s) => s.text).join('')).toBe(`start ${before} end`);
    expect(result.after.map((s) => s.text).join('')).toBe(`start ${after} end`);
    expect(result.after.some((s) => s.kind === 'added')).toBeTrue();
    expect(result.before.some((s) => s.kind === 'removed')).toBeTrue();
  });

  describe('folded view', () => {
    const words = (from: number, to: number) =>
      Array.from({ length: to - from }, (_, i) => `w${from + i}`).join(' ');

    it('folds long unchanged stretches and keeps a few words around each change', () => {
      const before = `${words(0, 40)} old ${words(40, 80)}`;
      const after = `${words(0, 40)} new ${words(40, 80)}`;

      const folded = diffWords(before, after).folded!;

      expect(folded.after.map((s) => s.kind)).toEqual(['gap', 'same', 'added', 'same', 'gap']);
      expect(folded.after[1].text.trim()).toBe(words(34, 40));
      expect(folded.after[3].text.trim()).toBe(words(40, 46));
      expect(folded.before.map((s) => s.kind)).toEqual(['gap', 'same', 'removed', 'same', 'gap']);
    });

    it('folds the same stretches on both sides, so a pure insertion lines up', () => {
      const before = `${words(0, 40)} ${words(40, 80)}`;
      const after = `${words(0, 40)} inserted ${words(40, 80)}`;

      const folded = diffWords(before, after).folded!;

      expect(folded.before.map((s) => s.kind)).toEqual(['gap', 'same', 'gap']);
      expect(folded.before[1].text.trim()).toBe(words(34, 46));
    });

    it('keeps the hidden text in each gap, so every side still rebuilds exactly', () => {
      const before = `${words(0, 40)} old ${words(40, 80)} older ${words(80, 120)}`;
      const after = `${words(0, 40)} new ${words(40, 80)} newer ${words(80, 120)}`;

      const folded = diffWords(before, after).folded!;

      expect(folded.before.filter((s) => s.kind === 'gap').length).toBe(3);
      expect(folded.before.map((s) => s.text).join('')).toBe(before);
      expect(folded.after.map((s) => s.text).join('')).toBe(after);
    });

    it('is null when nothing is long enough to fold', () => {
      expect(diffWords('In the name of God', 'In the name of Allah').folded).toBeNull();
      expect(diffWords(words(0, 40), words(0, 40)).folded).toBeNull();
    });
  });
});
