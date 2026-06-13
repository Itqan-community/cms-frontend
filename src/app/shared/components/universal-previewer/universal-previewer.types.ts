export type PreviewFileType = 'audio' | 'video' | 'image' | 'pdf' | 'csv' | 'unknown';

export interface PreviewSource {
  /** Presigned or public URL for direct binding. */
  url?: string;
  /** Already-fetched blob; previewer creates an object URL internally. */
  blob?: Blob;
  /** Preferred MIME hint when extension is ambiguous. */
  mimeType?: string;
  /** Used to derive extension when mimeType is absent. */
  fileName?: string;
  /** Optional display label in the preview chrome. */
  title?: string;
}

export type PreviewerHost = 'modal' | 'drawer';

export type PreviewerDrawerPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface PreviewerConfig {
  /** Overlay host; defaults to modal. */
  host?: PreviewerHost;
  /** Modal/drawer width (e.g. `min(900px, 92vw)`). */
  width?: string | number;
  /** Drawer placement when host is drawer. */
  drawerPlacement?: PreviewerDrawerPlacement;
  /** Overlay title; falls back to source.title or fileName. */
  title?: string;
}

export interface PreviewerModalData {
  source: PreviewSource;
}

export interface PreviewerDrawerData {
  source: PreviewSource;
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}
