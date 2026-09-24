import { diffWords } from './word-diff.util';

describe('diffWords', () => {
  it('marks removed words on the before side and added words on the after side', () => {
    const result = diffWords('In the name of God', 'In the name of Allah');

    expect(result).not.toBeNull();
    expect(result!.before).toEqual([
      { text: 'In the name of ', kind: 'same' },
      { text: 'God', kind: 'removed' },
    ]);
    expect(result!.after).toEqual([
      { text: 'In the name of ', kind: 'same' },
      { text: 'Allah', kind: 'added' },
    ]);
  });

  it('handles Arabic text and insertions in the middle', () => {
    const result = diffWords('بسم الله الرحيم', 'بسم الله الرحمن الرحيم');

    expect(result!.before.every((s) => s.kind === 'same')).toBeTrue();
    expect(result!.after.filter((s) => s.kind === 'added').map((s) => s.text.trim())).toEqual([
      'الرحمن',
    ]);
  });

  it('rebuilds each side exactly from its segments', () => {
    const before = 'one  two\nthree';
    const after = 'one two\nthree four';

    const result = diffWords(before, after)!;

    expect(result.before.map((s) => s.text).join('')).toBe(before);
    expect(result.after.map((s) => s.text).join('')).toBe(after);
  });

  it('returns null when the texts are too long to compare word by word', () => {
    const long = Array.from({ length: 2000 }, (_, i) => `w${i}`).join(' ');

    expect(diffWords(long, `${long} extra`)).toBeNull();
  });
});
