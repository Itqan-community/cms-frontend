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
