import { PREVIEW_CHARS, clipSegments, clipText, isPreviewCut } from './text-preview.util';
import { diffWords } from './word-diff.util';

const longText = (words: number) => Array.from({ length: words }, (_, i) => `word${i}`).join(' ');

describe('text preview', () => {
  it('leaves short text alone', () => {
    expect(clipText('in the name')).toEqual({ text: 'in the name', clipped: false });
  });

  it('cuts long text at a word boundary within the preview size', () => {
    const { text, clipped } = clipText(longText(200));

    expect(clipped).toBeTrue();
    expect(text.length).toBeLessThanOrEqual(PREVIEW_CHARS);
    expect(text.endsWith(' ')).toBeFalse();
    expect(longText(200).startsWith(text)).toBeTrue();
  });

  it('cuts a huge added run in a diff and ends with one gap holding the rest', () => {
    // Arrange — a whole new text: one enormous "added" run
    const diff = diffWords('', longText(500));

    // Act
    const { segments, clipped } = clipSegments(diff.after);

    // Assert
    expect(clipped).toBeTrue();
    const shown = segments
      .filter((s) => s.kind !== 'gap')
      .map((s) => s.text)
      .join('');
    expect(shown.length).toBeLessThanOrEqual(PREVIEW_CHARS);
    expect(segments[segments.length - 1].kind).toBe('gap');
    expect(segments.map((s) => s.text).join('')).toBe(longText(500));
  });

  it('does not count folded unchanged text against the preview', () => {
    const segments = [
      { text: 'x'.repeat(5000), kind: 'gap' as const },
      { text: 'changed', kind: 'added' as const },
    ];

    expect(clipSegments(segments)).toEqual({ segments, clipped: false });
  });

  it('offers the full text when either side is long or the diff was folded', () => {
    expect(isPreviewCut('a', 'b', null)).toBeFalse();
    expect(isPreviewCut('', longText(200), null)).toBeTrue();
    expect(isPreviewCut(longText(200), '', null)).toBeTrue();
  });
});
