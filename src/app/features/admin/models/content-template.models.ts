/** Row granularity for per-asset content templates. Immutable after asset creation. */
export type ContentTemplate = 'surah' | 'ayah' | 'page' | 'word';

/** Mushaf print layout; required when {@link ContentTemplate} is `page`. */
export type MushafPrint = 'madinah_1405' | 'madinah_1422' | 'madinah_1441' | 'indopak';

export const CONTENT_TEMPLATES: ContentTemplate[] = ['surah', 'ayah', 'page', 'word'];

export const MUSHAF_PRINTS: MushafPrint[] = [
  'madinah_1405',
  'madinah_1422',
  'madinah_1441',
  'indopak',
];

/** Column role in the content grid / CSV template. */
export type ContentColumnRole = 'key' | 'reference' | 'editable';

export interface ContentColumnDescriptor {
  /** Field name on grid rows and CSV header slug. */
  field: string;
  /** i18n key under `ADMIN.CONTENT_EDITOR.COLUMNS`. */
  headerKey: string;
  role: ContentColumnRole;
  editable: boolean;
  width?: number;
  flex?: number;
  rtl?: boolean;
  filter?: 'number' | 'text' | 'surah';
}

export interface ContentTemplateDescriptor {
  template: ContentTemplate;
  /** CSV header row (field slugs). */
  csvHeaders: string[];
  /** Fields that uniquely identify a row for import / diff. */
  keyFields: string[];
  /** Fields editors may write (grid + CSV). */
  editableFields: string[];
  columns: ContentColumnDescriptor[];
}
