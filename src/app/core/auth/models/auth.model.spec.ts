import { normalizeProfilePermissionCodes } from './auth.model';

describe('auth.model / normalizeProfilePermissionCodes', () => {
  it('returns empty array for null/undefined/empty input', () => {
    expect(normalizeProfilePermissionCodes(undefined)).toEqual([]);
    expect(normalizeProfilePermissionCodes(null)).toEqual([]);
    expect(normalizeProfilePermissionCodes([])).toEqual([]);
  });

  it('deduplicates and trims code_name values', () => {
    expect(
      normalizeProfilePermissionCodes([
        { code_name: ' portal_access ', name: 'A' },
        { code_name: 'portal_access', name: 'B' },
        { code_name: 'portal_read_tafsir', name: 'C' },
      ])
    ).toEqual(['portal_access', 'portal_read_tafsir']);
  });

  it('skips empty code_name entries', () => {
    expect(
      normalizeProfilePermissionCodes([
        { code_name: '', name: 'x' },
        { code_name: 'a', name: 'y' },
      ])
    ).toEqual(['a']);
  });
});
