import type { ContentEntry, ContentEntryPatch } from '../models/asset-content.models';
import type { ContentTemplate } from '../models/content-template.models';
import { getContentTemplateDescriptor } from './content-template.util';
import { parseClipboardTable } from './clipboard-table.util';

export interface CsvImportRowError {
  rowNumber: number;
  message: string;
}

export interface CsvImportValidationResult {
  valid: boolean;
  headerMismatch: boolean;
  expectedHeaders: string[];
  actualHeaders: string[];
  rowErrors: CsvImportRowError[];
  patches: ContentEntryPatch[];
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

/**
 * Validate a CSV file's text against the active template and map rows to entry patches.
 * Matching is by `sura`+`aya` for ayah/word templates, `sura` for surah, `page_number` for page.
 */
export function validateAndMapCsvImport(
  csvText: string,
  template: ContentTemplate,
  existingEntries: ContentEntry[]
): CsvImportValidationResult {
  const descriptor = getContentTemplateDescriptor(template);
  const table = parseClipboardTable(csvText);
  const rowErrors: CsvImportRowError[] = [];
  const patches: ContentEntryPatch[] = [];

  if (table.length === 0) {
    return {
      valid: false,
      headerMismatch: false,
      expectedHeaders: descriptor.csvHeaders,
      actualHeaders: [],
      rowErrors: [{ rowNumber: 0, message: 'EMPTY_FILE' }],
      patches: [],
    };
  }

  const headerRow = table[0].map(normalizeHeader);
  const expected = descriptor.csvHeaders.map(normalizeHeader);
  const headerMismatch =
    headerRow.length !== expected.length || headerRow.some((h, i) => h !== expected[i]);

  if (headerMismatch) {
    return {
      valid: false,
      headerMismatch: true,
      expectedHeaders: descriptor.csvHeaders,
      actualHeaders: table[0],
      rowErrors: [],
      patches: [],
    };
  }

  const entryByKey = new Map<string, ContentEntry>();
  for (const entry of existingEntries) {
    if (template === 'ayah' || template === 'word') {
      entryByKey.set(`${entry.sura}:${entry.aya}`, entry);
    } else if (template === 'surah') {
      entryByKey.set(String(entry.sura), entry);
    } else {
      entryByKey.set(String(entry.ayah_id), entry);
    }
  }

  const colIndex = Object.fromEntries(descriptor.csvHeaders.map((h, i) => [h, i]));

  for (let i = 1; i < table.length; i++) {
    const row = table[i];
    const rowNumber = i + 1;
    if (row.every((cell) => cell.trim() === '')) continue;

    let key: string;
    if (template === 'ayah' || template === 'word') {
      const sura = row[colIndex['sura']]?.trim();
      const aya = row[colIndex['aya']]?.trim();
      if (!sura || !aya) {
        rowErrors.push({ rowNumber, message: 'MISSING_KEY' });
        continue;
      }
      key = `${sura}:${aya}`;
    } else if (template === 'surah') {
      const sura = row[colIndex['sura']]?.trim();
      if (!sura) {
        rowErrors.push({ rowNumber, message: 'MISSING_KEY' });
        continue;
      }
      key = sura;
    } else {
      const page = row[colIndex['page_number']]?.trim();
      if (!page) {
        rowErrors.push({ rowNumber, message: 'MISSING_KEY' });
        continue;
      }
      key = page;
    }

    const entry = entryByKey.get(key);
    if (!entry) {
      rowErrors.push({ rowNumber, message: 'UNKNOWN_ROW' });
      continue;
    }

    const textIdx = colIndex['text'];
    const footnotesIdx = colIndex['footnotes'];
    patches.push({
      ayah_id: entry.ayah_id,
      text: textIdx !== undefined ? (row[textIdx] ?? '') : entry.text,
      footnotes: footnotesIdx !== undefined ? (row[footnotesIdx] ?? '') : entry.footnotes,
    });
  }

  return {
    valid: rowErrors.length === 0 && patches.length > 0,
    headerMismatch: false,
    expectedHeaders: descriptor.csvHeaders,
    actualHeaders: table[0],
    rowErrors,
    patches,
  };
}

/** Split patches into fixed-size chunks for batched PATCH requests. */
export function chunkPatches<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
