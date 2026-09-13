import {
  normalizeClipboardForTextPaste,
  parseClipboardTable,
  serializeCsv,
} from './clipboard-table.util';

describe('parseClipboardTable', () => {
  it('parses TSV (spreadsheet) rows and columns', () => {
    const table = parseClipboardTable('a\tb\nc\td');
    expect(table).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('parses simple CSV when no tabs are present', () => {
    const table = parseClipboardTable('1,one\n2,two');
    expect(table).toEqual([
      ['1', 'one'],
      ['2', 'two'],
    ]);
  });

  it('respects quoted CSV fields containing commas', () => {
    const table = parseClipboardTable('1,"hello, world"\n2,plain');
    expect(table).toEqual([
      ['1', 'hello, world'],
      ['2', 'plain'],
    ]);
  });

  it('handles embedded newlines inside quoted fields', () => {
    const table = parseClipboardTable('1,"line one\nline two"\n2,next');
    expect(table).toEqual([
      ['1', 'line one\nline two'],
      ['2', 'next'],
    ]);
  });

  it('unescapes doubled quotes', () => {
    const table = parseClipboardTable('1,"say ""hi"""');
    expect(table).toEqual([['1', 'say "hi"']]);
  });

  it('ignores a trailing newline (no blank final row)', () => {
    const table = parseClipboardTable('a,b\n');
    expect(table).toEqual([['a', 'b']]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseClipboardTable('')).toEqual([]);
  });

  it('parses a single value', () => {
    expect(parseClipboardTable('solo')).toEqual([['solo']]);
  });
});

describe('serializeCsv', () => {
  it('joins rows and columns with commas and newlines', () => {
    expect(
      serializeCsv([
        ['sura', 'aya', 'text'],
        ['1', '1', 'hello'],
      ])
    ).toBe('sura,aya,text\n1,1,hello');
  });

  it('quotes fields containing commas, quotes or newlines', () => {
    expect(serializeCsv([['1', 'a, b', 'say "hi"', 'line1\nline2']])).toBe(
      '1,"a, b","say ""hi""","line1\nline2"'
    );
  });

  it('round-trips with parseClipboardTable', () => {
    const table = [
      ['sura', 'aya', 'text'],
      ['1', '1', 'with, comma'],
      ['1', '2', 'multi\nline'],
    ];
    expect(parseClipboardTable(serializeCsv(table))).toEqual(table);
  });
});

describe('normalizeClipboardForTextPaste', () => {
  it('extracts the text column from a surah/ayah CSV export', () => {
    const table = [
      ['surah', 'ayah', 'text'],
      ['1', '1', 'In the name'],
      ['1', '2', 'Praise be'],
    ];
    expect(normalizeClipboardForTextPaste(table)).toEqual([['In the name'], ['Praise be']]);
  });

  it('accepts legacy sura/aya headers', () => {
    const table = [
      ['sura', 'aya', 'text'],
      ['2', '1', 'Alif Lam'],
    ];
    expect(normalizeClipboardForTextPaste(table)).toEqual([['Alif Lam']]);
  });

  it('leaves raw spreadsheet pastes unchanged', () => {
    const table = [['line one'], ['line two']];
    expect(normalizeClipboardForTextPaste(table)).toEqual(table);
  });

  it('leaves multi-column pastes without id headers unchanged', () => {
    const table = [
      ['hello', 'world'],
      ['foo', 'bar'],
    ];
    expect(normalizeClipboardForTextPaste(table)).toEqual(table);
  });
});
