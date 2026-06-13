import { ParsedCsv, PreviewFileType, PreviewSource } from './universal-previewer.types';

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif']);

function normalizeExtension(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const withoutQuery = trimmed.split('?')[0]?.split('#')[0] ?? trimmed;
  const lastSegment = withoutQuery.split('/').pop() ?? withoutQuery;
  const dotIndex = lastSegment.lastIndexOf('.');

  if (dotIndex < 0 || dotIndex === lastSegment.length - 1) {
    return null;
  }

  return lastSegment.slice(dotIndex + 1);
}

function extensionFromSource(source: PreviewSource): string | null {
  return normalizeExtension(source.fileName) ?? normalizeExtension(source.url);
}

function fileTypeFromMime(mimeType: string): PreviewFileType | null {
  const mime = mimeType.trim().toLowerCase();

  if (mime.startsWith('audio/')) {
    return 'audio';
  }
  if (mime.startsWith('video/')) {
    return 'video';
  }
  if (mime.startsWith('image/')) {
    return 'image';
  }
  if (mime === 'application/pdf' || mime === 'application/x-pdf') {
    return 'pdf';
  }
  if (mime === 'text/csv' || mime === 'application/csv' || mime === 'text/comma-separated-values') {
    return 'csv';
  }

  return null;
}

function fileTypeFromExtension(extension: string): PreviewFileType | null {
  if (AUDIO_EXTENSIONS.has(extension)) {
    return 'audio';
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }
  if (extension === 'pdf') {
    return 'pdf';
  }
  if (extension === 'csv') {
    return 'csv';
  }

  return null;
}

export function detectFileType(source: PreviewSource): PreviewFileType {
  if (source.mimeType) {
    const fromMime = fileTypeFromMime(source.mimeType);
    if (fromMime) {
      return fromMime;
    }
  }

  const extension = extensionFromSource(source);
  if (extension) {
    const fromExtension = fileTypeFromExtension(extension);
    if (fromExtension) {
      return fromExtension;
    }
  }

  return 'unknown';
}

function splitCsvLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim());
}

export function parseCsv(text: string): ParsedCsv {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, allLines) => {
      if (line.length > 0) {
        return true;
      }
      return index < allLines.length - 1;
    });

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0] ?? '');
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });

    return row;
  });

  return { headers, rows };
}

export function resolvePreviewTitle(source: PreviewSource, fallbackTitle?: string): string {
  return source.title?.trim() || source.fileName?.trim() || fallbackTitle?.trim() || '';
}
