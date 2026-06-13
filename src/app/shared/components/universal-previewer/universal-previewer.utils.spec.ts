import { detectFileType, parseCsv } from './universal-previewer.utils';

describe('universal-previewer.utils', () => {
  describe('detectFileType', () => {
    it('detects audio from mime type', () => {
      expect(detectFileType({ url: 'https://example.com/file', mimeType: 'audio/mpeg' })).toBe(
        'audio'
      );
    });

    it('detects video from extension when mime is absent', () => {
      expect(detectFileType({ url: 'https://example.com/clip.mp4' })).toBe('video');
    });

    it('detects csv from file name', () => {
      expect(detectFileType({ fileName: 'export.csv' })).toBe('csv');
    });

    it('returns unknown for unsupported types', () => {
      expect(detectFileType({ fileName: 'archive.zip' })).toBe('unknown');
    });
  });

  describe('parseCsv', () => {
    it('parses headers and rows from csv text', () => {
      const result = parseCsv('name,age\nAli,30\nSara,25\n');

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toEqual([
        { name: 'Ali', age: '30' },
        { name: 'Sara', age: '25' },
      ]);
    });

    it('returns empty structures for empty csv', () => {
      expect(parseCsv('')).toEqual({ headers: [], rows: [] });
    });
  });
});
