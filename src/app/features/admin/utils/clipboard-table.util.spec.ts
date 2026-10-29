import {
  mapClipboardToColumns,
  parseClipboardHtml,
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

describe('parseClipboardHtml', () => {
  it('keeps an in-cell <br> as a line break inside the cell (Excel)', () => {
    const html =
      "<html><body><table><tr><td class=xl65>line one<br\r\n  style='mso-data-placement:same-cell;'>line\r\n  two</td>" +
      '<td>b</td></tr><tr><td>c</td><td>d</td></tr></table></body></html>';
    expect(parseClipboardHtml(html)).toEqual([
      ['line one\nline two', 'b'],
      ['c', 'd'],
    ]);
  });

  it('reads a Google Sheets range', () => {
    const html =
      '<google-sheets-html-origin><style>td{}</style><table><tbody>' +
      '<tr><td>a<br>b<br>c</td></tr><tr><td>next</td></tr></tbody></table>';
    expect(parseClipboardHtml(html)).toEqual([['a\nb\nc'], ['next']]);
  });

  it('reads a single Google Sheets cell as one cell', () => {
    const html =
      '<meta charset="utf-8"><google-sheets-html-origin><span data-sheets-root="1" ' +
      'data-sheets-value="{}">first<br>second</span></google-sheets-html-origin>';
    expect(parseClipboardHtml(html)).toEqual([['first\nsecond']]);
  });

  it('keeps blank cells and fills merged columns with blanks', () => {
    const html = '<table><tr><td colspan="2">wide</td><td></td><td>x</td></tr></table>';
    expect(parseClipboardHtml(html)).toEqual([['wide', '', '', 'x']]);
  });

  it('turns non-breaking spaces into plain spaces', () => {
    expect(parseClipboardHtml('<table><tr><td>a&nbsp;&nbsp;b</td></tr></table>')).toEqual([
      ['a  b'],
    ]);
  });

  it('returns null when the HTML holds no table', () => {
    expect(parseClipboardHtml('<p>one</p><p>two</p>')).toBeNull();
    expect(parseClipboardHtml('')).toBeNull();
  });
});

describe('serializeCsv', () => {
  it('joins rows and columns with commas and newlines', () => {
    expect(
      serializeCsv([
        ['surah', 'ayah', 'text'],
        ['1', '1', 'hello'],
      ])
    ).toBe('surah,ayah,text\n1,1,hello');
  });

  it('quotes fields containing commas, quotes or newlines', () => {
    expect(serializeCsv([['1', 'a, b', 'say "hi"', 'line1\nline2']])).toBe(
      '1,"a, b","say ""hi""","line1\nline2"'
    );
  });

  it('round-trips with parseClipboardTable', () => {
    const table = [
      ['surah', 'ayah', 'text'],
      ['1', '1', 'with, comma'],
      ['1', '2', 'multi\nline'],
    ];
    expect(parseClipboardTable(serializeCsv(table))).toEqual(table);
  });
});

describe('mapClipboardToColumns', () => {
  const TEXT = ['text'];

  it('extracts the text column from a surah/ayah CSV export', () => {
    const table = [
      ['surah', 'ayah', 'text'],
      ['1', '1', 'In the name'],
      ['1', '2', 'Praise be'],
    ];
    expect(mapClipboardToColumns(table, TEXT)).toEqual({
      keys: ['text'],
      rows: [['In the name'], ['Praise be']],
    });
  });

  it("extracts the text column from the grid's label/reference_text copy", () => {
    const table = [
      ['label', 'reference_text', 'text'],
      ['2:255', 'ٱللَّهُ لَآ إِلَٰهَ', 'Allah - there is no deity'],
    ];
    expect(mapClipboardToColumns(table, TEXT)).toEqual({
      keys: ['text'],
      rows: [['Allah - there is no deity']],
    });
  });

  it('extracts the text column from word and page template exports', () => {
    expect(
      mapClipboardToColumns(
        [
          ['word_id', 'surah', 'ayah', 'word', 'text'],
          ['1', '1', '1', '1', 'In the name'],
        ],
        TEXT
      )
    ).toEqual({ keys: ['text'], rows: [['In the name']] });
    expect(
      mapClipboardToColumns(
        [
          ['page', 'text'],
          ['42', 'Page note'],
        ],
        TEXT
      )
    ).toEqual({ keys: ['text'], rows: [['Page note']] });
  });

  it('accepts legacy surah/ayah headers', () => {
    const table = [
      ['surah', 'ayah', 'text'],
      ['2', '1', 'Alif Lam'],
    ];
    expect(mapClipboardToColumns(table, TEXT)).toEqual({ keys: ['text'], rows: [['Alif Lam']] });
  });

  it("maps the grid's own multi-column copy onto its columns, dropping identifiers", () => {
    const table = [
      ['label', 'reference_text', 'question', 'answer'],
      ['1:1', 'بسم الله', 'Q', 'A'],
    ];
    expect(mapClipboardToColumns(table, ['question', 'answer'])).toEqual({
      keys: ['question', 'answer'],
      rows: [['Q', 'A']],
    });
  });

  it('maps a multi-column file export by header, keeping only known columns', () => {
    const table = [
      ['surah', 'ayah', 'answer', 'question', 'notes'],
      ['1', '1', 'A', 'Q', 'n'],
    ];
    expect(mapClipboardToColumns(table, ['question', 'answer'])).toEqual({
      keys: ['answer', 'question'],
      rows: [['A', 'Q']],
    });
  });

  it('leaves raw spreadsheet pastes for positional paste', () => {
    const table = [['line one'], ['line two']];
    expect(mapClipboardToColumns(table, TEXT)).toEqual({ keys: null, rows: table });
  });

  it('leaves multi-column pastes without id headers for positional paste', () => {
    const table = [
      ['hello', 'world'],
      ['foo', 'bar'],
    ];
    expect(mapClipboardToColumns(table, ['question', 'answer'])).toEqual({
      keys: null,
      rows: table,
    });
  });
});
