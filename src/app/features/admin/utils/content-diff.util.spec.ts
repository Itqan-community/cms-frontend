import { computeContentDiff } from './content-diff.util';
import type { ContentEntry } from '../models/asset-content.models';

function entry(overrides: Partial<ContentEntry>): ContentEntry {
  return {
    id: 1,
    ayah_id: 1,
    sura: 1,
    aya: 1,
    surah_name: 'الفاتحة',
    uthmani: 'x',
    text: '',
    footnotes: '',
    order: 1,
    ...overrides,
  };
}

describe('computeContentDiff', () => {
  it('returns rows where text or footnotes changed', () => {
    const base = [entry({ text: 'a', footnotes: '' })];
    const draft = [entry({ text: 'b', footnotes: '1' })];
    const diffs = computeContentDiff('ayah', base, draft);
    expect(diffs.length).toBe(1);
    expect(diffs[0].beforeText).toBe('a');
    expect(diffs[0].afterText).toBe('b');
    expect(diffs[0].footnotesChanged).toBeTrue();
  });

  it('returns empty when nothing changed', () => {
    const rows = [entry({ text: 'same' })];
    expect(computeContentDiff('ayah', rows, rows)).toEqual([]);
  });
});
