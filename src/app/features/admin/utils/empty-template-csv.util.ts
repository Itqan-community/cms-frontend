import type { QuranPage, QuranWord, SurahStats } from '../services/quran-data.service';
import type { EnrichedAyah } from '../services/quran-data.service';
import type { ContentTemplate, MushafPrint } from '../models/content-template.models';
import { getContentTemplateDescriptor } from './content-template.util';
import { serializeCsv } from './clipboard-table.util';

export type EmptyTemplateRow = Record<string, string>;

/**
 * Build empty template rows for CSV download.
 *
 * Page-based rows use the bundled `quraan_data.json` page map only — per-print page
 * boundaries (Medina 1405 vs 1422, etc.) require backend-owned maps once
 * `mushaf_print` is persisted on the asset.
 */
export function buildEmptyTemplateRows(
  template: ContentTemplate,
  data: {
    surahs?: SurahStats[];
    ayahs?: EnrichedAyah[];
    pages?: QuranPage[];
    words?: QuranWord[];
  }
): EmptyTemplateRow[] {
  const { columns } = getContentTemplateDescriptor(template);
  const emptyEditable = Object.fromEntries(
    columns.filter((c) => c.editable).map((c) => [c.field, ''])
  );

  switch (template) {
    case 'surah':
      return (data.surahs ?? []).map((s) => ({
        sura: String(s.surah_number),
        surah_name: s.name_ar,
        ...emptyEditable,
      }));
    case 'ayah':
      return (data.ayahs ?? []).map((a) => ({
        sura: String(a.chapter),
        aya: String(a.number),
        surah_name: a.surah_name,
        uthmani: a.text,
        ...emptyEditable,
      }));
    case 'page':
      return (data.pages ?? []).map((p) => ({
        page_number: String(p.page_number),
        juz_number: String(p.juz_number),
        surahs_on_page: p.surahs.join('; '),
        ...emptyEditable,
      }));
    case 'word':
      return (data.words ?? []).map((w) => ({
        sura: String(w.surah_id),
        aya: String(w.ayah_id),
        word_position: String(w.position),
        uthmani_word: w.text_uthmani,
        ...emptyEditable,
      }));
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}

export function emptyTemplateToCsv(template: ContentTemplate, rows: EmptyTemplateRow[]): string {
  const { csvHeaders } = getContentTemplateDescriptor(template);
  const table = [csvHeaders, ...rows.map((r) => csvHeaders.map((h) => r[h] ?? ''))];
  return serializeCsv(table);
}

export function emptyTemplateFilename(
  assetSlug: string,
  template: ContentTemplate,
  mushafPrint?: MushafPrint | null
): string {
  const printSuffix = template === 'page' && mushafPrint ? `-${mushafPrint}` : '';
  return `${assetSlug}-${template}${printSuffix}-template.csv`;
}

export function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
