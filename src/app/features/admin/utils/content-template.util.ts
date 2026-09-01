import type { ColDef } from 'ag-grid-community';
import type { ContentEntry } from '../models/asset-content.models';
import type {
  ContentColumnDescriptor,
  ContentTemplate,
  ContentTemplateDescriptor,
} from '../models/content-template.models';
import { SurahFloatingFilterComponent } from '../components/asset-content-grid/surah-floating-filter.component';

const EDITABLE_CELL_EDITOR = {
  cellEditor: 'agLargeTextCellEditor' as const,
  cellEditorPopup: true,
  cellEditorParams: { maxLength: 100000, rows: 12, cols: 60 },
  wrapText: true,
  autoHeight: true,
};

function col(
  field: string,
  headerKey: string,
  role: ContentColumnDescriptor['role'],
  editable: boolean,
  extra: Partial<ContentColumnDescriptor> = {}
): ContentColumnDescriptor {
  return { field, headerKey, role, editable, ...extra };
}

const AYAH_COLUMNS: ContentColumnDescriptor[] = [
  col('sura', 'SURA', 'key', false, { width: 110, filter: 'number' }),
  col('aya', 'AYA', 'key', false, { width: 110, filter: 'number' }),
  col('surah_name', 'SURAH', 'reference', false, { width: 170, filter: 'surah' }),
  col('uthmani', 'UTHMANI', 'reference', false, { flex: 1, rtl: true }),
  col('text', 'TEXT', 'editable', true, { flex: 2 }),
  col('footnotes', 'FOOTNOTES', 'editable', true, { flex: 1 }),
];

const SURAH_COLUMNS: ContentColumnDescriptor[] = [
  col('sura', 'SURA', 'key', false, { width: 110, filter: 'number' }),
  col('surah_name', 'SURAH', 'reference', false, { width: 200, filter: 'surah' }),
  col('text', 'TEXT', 'editable', true, { flex: 2 }),
  col('footnotes', 'FOOTNOTES', 'editable', true, { flex: 1 }),
];

const PAGE_COLUMNS: ContentColumnDescriptor[] = [
  col('page_number', 'PAGE', 'key', false, { width: 110, filter: 'number' }),
  col('juz_number', 'JUZ', 'reference', false, { width: 90, filter: 'number' }),
  col('surahs_on_page', 'SURAHS_ON_PAGE', 'reference', false, { flex: 1 }),
  col('text', 'TEXT', 'editable', true, { flex: 2 }),
  col('footnotes', 'FOOTNOTES', 'editable', true, { flex: 1 }),
];

const WORD_COLUMNS: ContentColumnDescriptor[] = [
  col('sura', 'SURA', 'key', false, { width: 90, filter: 'number' }),
  col('aya', 'AYA', 'key', false, { width: 90, filter: 'number' }),
  col('word_position', 'WORD_POSITION', 'key', false, { width: 120, filter: 'number' }),
  col('uthmani_word', 'UTHMANI_WORD', 'reference', false, { flex: 1, rtl: true }),
  col('text', 'TEXT', 'editable', true, { flex: 2 }),
  col('footnotes', 'FOOTNOTES', 'editable', true, { flex: 1 }),
];

function descriptor(
  template: ContentTemplate,
  columns: ContentColumnDescriptor[]
): ContentTemplateDescriptor {
  const keyFields = columns.filter((c) => c.role === 'key').map((c) => c.field);
  const editableFields = columns.filter((c) => c.editable).map((c) => c.field);
  return {
    template,
    columns,
    keyFields,
    editableFields,
    csvHeaders: columns.map((c) => c.field),
  };
}

const DESCRIPTORS: Record<ContentTemplate, ContentTemplateDescriptor> = {
  ayah: descriptor('ayah', AYAH_COLUMNS),
  surah: descriptor('surah', SURAH_COLUMNS),
  page: descriptor('page', PAGE_COLUMNS),
  word: descriptor('word', WORD_COLUMNS),
};

/** Default template until the asset exposes `template` from the API. */
export const DEFAULT_CONTENT_TEMPLATE: ContentTemplate = 'ayah';

export function getContentTemplateDescriptor(
  template: ContentTemplate = DEFAULT_CONTENT_TEMPLATE
): ContentTemplateDescriptor {
  return DESCRIPTORS[template];
}

export function buildContentColumnDefs(
  template: ContentTemplate,
  colHeader: (key: string) => string,
  surahOptionsProvider?: () => { value: string; label: string }[]
): ColDef<ContentEntry>[] {
  const descriptor = getContentTemplateDescriptor(template);
  return descriptor.columns.map((colDef) => {
    const def: ColDef<ContentEntry> = {
      field: colDef.field as keyof ContentEntry & string,
      headerName: colHeader(colDef.headerKey),
      editable: colDef.editable,
      resizable: true,
      sortable: true,
    };
    if (colDef.width !== undefined) def.width = colDef.width;
    if (colDef.flex !== undefined) def.flex = colDef.flex;
    if (colDef.rtl) {
      def.cellStyle = { direction: 'rtl', fontFamily: 'serif' };
    }
    if (colDef.filter === 'number') {
      def.filter = 'agNumberColumnFilter';
      def.floatingFilter = true;
    } else if (colDef.filter === 'text') {
      def.filter = 'agTextColumnFilter';
      def.floatingFilter = true;
    } else if (colDef.filter === 'surah' && surahOptionsProvider) {
      def.filter = 'agTextColumnFilter';
      def.floatingFilter = true;
      def.floatingFilterComponent = SurahFloatingFilterComponent;
      def.floatingFilterComponentParams = { optionsProvider: surahOptionsProvider };
    }
    if (colDef.editable) {
      Object.assign(def, EDITABLE_CELL_EDITOR);
    }
    return def;
  });
}

/** Stable row key for diff / import matching. */
export function contentRowKey(
  template: ContentTemplate,
  row: Record<string, string | number | null | undefined>
): string {
  const { keyFields } = getContentTemplateDescriptor(template);
  return keyFields.map((f) => String(row[f] ?? '')).join(':');
}

/** Row key from a {@link ContentEntry} (ayah template). */
export function contentEntryKey(template: ContentTemplate, entry: ContentEntry): string {
  if (template === 'ayah' || template === 'word') {
    return `${entry.sura}:${entry.aya}`;
  }
  if (template === 'surah') {
    return String(entry.sura);
  }
  return String(entry.ayah_id);
}
