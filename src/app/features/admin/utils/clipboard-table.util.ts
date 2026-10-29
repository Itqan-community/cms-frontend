/**
 * Parse clipboard text copied from a spreadsheet or CSV file into a 2D grid of
 * strings. Handles both TSV (how Excel/Google Sheets put data on the clipboard)
 * and CSV, including RFC-4180 quoted fields that contain the delimiter, quotes
 * (escaped as ""), or embedded newlines.
 *
 * The delimiter is auto-detected from the first physical line: tab wins if any
 * tab is present, otherwise comma.
 */
export function parseClipboardTable(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (normalized === '') {
    return [];
  }

  const firstLine = normalized.split('\n', 1)[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // Flush the final field/row (no trailing newline).
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop a trailing blank row produced by a final newline.
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/** A cell's text as the browser would show it: markup whitespace collapses to
 *  one space, `<br>` is a line break. */
function htmlCellText(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += (child.textContent ?? '').replace(/[ \t\r\n\f]+/g, ' ');
    } else if (child instanceof HTMLBRElement) {
      out += '\n';
    } else if (!(child instanceof HTMLStyleElement || child instanceof HTMLScriptElement)) {
      out += htmlCellText(child);
    }
  });
  return out;
}

function cleanCellText(text: string): string {
  return text
    .replace(/ *\n */g, '\n')
    .replace(/^ +| +$/g, '')
    .replace(/\u00a0/g, ' ');
}

/**
 * Parse the `text/html` a spreadsheet puts on the clipboard, which is what Excel
 * itself pastes from. A line break inside a cell is a `<br>` there, while the
 * plain-text copy can't always tell it from a row break (Google Sheets copies a
 * single cell unquoted). Returns null when the HTML holds no spreadsheet data, so
 * the caller falls back to {@link parseClipboardTable}.
 */
export function parseClipboardHtml(html: string): string[][] | null {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (table) {
    return Array.from(table.rows).map((tr) =>
      Array.from(tr.cells).flatMap((cell) => [
        cleanCellText(htmlCellText(cell)),
        ...Array<string>(Math.max(cell.colSpan, 1) - 1).fill(''),
      ])
    );
  }
  // A single Google Sheets cell comes as a span, not a table.
  const sheetsCell = doc.querySelector('[data-sheets-root], [data-sheets-value]');
  return sheetsCell ? [[cleanCellText(htmlCellText(sheetsCell))]] : null;
}

/** Quote a single CSV field per RFC 4180 when it contains a comma, quote or newline. */
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Serialize a table of string cells to RFC-4180 CSV text (comma-delimited,
 * `\n` line endings). Round-trips with {@link parseClipboardTable}.
 */
export function serializeCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => csvField(cell ?? '')).join(',')).join('\n');
}

// `sura` / `aya` are the pre-Marqoom export headers, still recognised when pasted.
const CSV_ID_HEADERS = new Set(['surah', 'sura', 'ayah', 'aya', 'label', 'word_id', 'page']);

/** Clipboard cells to write: by column key when the table has a recognised header,
 *  else positional (`keys` null) from the focused cell. */
export interface ClipboardCells {
  keys: string[] | null;
  rows: string[][];
}

/**
 * When clipboard data is a content CSV (the grid's `label,reference_text,<keys…>`
 * copy, or a file export such as `surah,ayah,<keys…>`, `surah,text`,
 * `word_id,surah,ayah,word,text` or `page,text`), keep only the columns named after
 * one of ``columnKeys`` (no header), so a paste can't write identifiers or Quran
 * text into content cells. Anything else (a raw spreadsheet selection) is left for
 * positional paste.
 */
export function mapClipboardToColumns(table: string[][], columnKeys: string[]): ClipboardCells {
  if (table.length === 0) return { keys: null, rows: table };
  const header = table[0].map((c) => c.trim().toLowerCase());
  const known = new Set(columnKeys);
  const indexes = header.map((h, i) => (known.has(h) ? i : -1)).filter((i) => i >= 0);
  const hasId = header.some((h) => CSV_ID_HEADERS.has(h));
  if (indexes.length === 0 || !hasId) {
    return { keys: null, rows: table };
  }
  return {
    keys: indexes.map((i) => header[i]),
    rows: table.slice(1).map((row) => indexes.map((i) => row[i] ?? '')),
  };
}
