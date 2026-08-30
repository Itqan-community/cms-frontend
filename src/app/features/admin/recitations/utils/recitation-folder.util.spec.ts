import {
  RecitationFolderQuality,
  type RecitationFolderOut,
} from '../models/recitation-folders.models';
import {
  FOLDER_QUALITY_ORDER,
  canEditFolderVariant,
  canSetFolderAsDefault,
  canToggleFolderVisibility,
  folderDisplayName,
  folderVariantKey,
  formatFolderVariantNames,
  isFolderVisible,
  parseFolderVariant,
  takenFolderVariantKeys,
} from './recitation-folder.util';

function makeFolder(overrides: Partial<RecitationFolderOut> = {}): RecitationFolderOut {
  return {
    id: 1,
    name: 'Default',
    name_ar: 'افتراضي',
    name_en: 'Default',
    slug: 'default',
    is_default: false,
    tracks_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const allVariants = FOLDER_QUALITY_ORDER.flatMap((quality) => [
  { quality, hasFx: false },
  { quality, hasFx: true },
]);

describe('folderDisplayName', () => {
  it('prefers the active language and falls back to the other name', () => {
    const folder = makeFolder({ name_ar: 'مع مؤثرات', name_en: 'With effects' });
    expect(folderDisplayName(folder, 'en')).toBe('With effects');
    expect(folderDisplayName(folder, 'ar')).toBe('مع مؤثرات');
    expect(folderDisplayName({ ...folder, name_en: null }, 'en')).toBe('مع مؤثرات');
    expect(folderDisplayName({ ...folder, name_ar: '' }, 'ar')).toBe('With effects');
  });

  it('falls back to the unlocalized name when both localized names are blank', () => {
    const folder = makeFolder({ name: '128kbps', name_ar: null, name_en: null });
    expect(folderDisplayName(folder, 'en')).toBe('128kbps');
    expect(folderDisplayName(folder, 'ar')).toBe('128kbps');
  });
});

describe('formatFolderVariantNames / parseFolderVariant round trip', () => {
  it('parses back every variant it can generate', () => {
    for (const variant of allVariants) {
      const names = formatFolderVariantNames(variant);
      const parsed = parseFolderVariant({
        name: names.name_en,
        name_ar: names.name_ar,
        name_en: names.name_en,
      });
      expect(parsed).withContext(folderVariantKey(variant)).toEqual(variant);
    }
  });

  it('produces a distinct name pair for every variant', () => {
    const arabic = new Set(allVariants.map((v) => formatFolderVariantNames(v).name_ar));
    const english = new Set(allVariants.map((v) => formatFolderVariantNames(v).name_en));
    expect(arabic.size).toBe(allVariants.length);
    expect(english.size).toBe(allVariants.length);
  });

  it('names bitrate variants so the backend slug stays readable', () => {
    expect(
      formatFolderVariantNames({ quality: RecitationFolderQuality.KBPS_320, hasFx: true })
    ).toEqual({ name_ar: '320 كيلوبت بالمؤثرات', name_en: '320kbps with effects' });
    expect(
      formatFolderVariantNames({ quality: RecitationFolderQuality.KBPS_128, hasFx: false })
    ).toEqual({ name_ar: '128 كيلوبت', name_en: '128kbps' });
  });

  it('names the effects-only variant without a bitrate', () => {
    expect(
      formatFolderVariantNames({ quality: RecitationFolderQuality.ORIGINAL, hasFx: true })
    ).toEqual({ name_ar: 'بالمؤثرات', name_en: 'With effects' });
  });

  it('recognises a variant from either language alone', () => {
    expect(parseFolderVariant({ name: '', name_ar: '192 كيلوبت', name_en: null })).toEqual({
      quality: RecitationFolderQuality.KBPS_192,
      hasFx: false,
    });
    expect(parseFolderVariant({ name: '', name_ar: null, name_en: '64kbps with effects' })).toEqual(
      {
        quality: RecitationFolderQuality.KBPS_64,
        hasFx: true,
      }
    );
  });

  it('ignores surrounding whitespace and letter case', () => {
    expect(
      parseFolderVariant({ name: '  320KBPS With Effects  ', name_ar: null, name_en: null })
    ).toEqual({ quality: RecitationFolderQuality.KBPS_320, hasFx: true });
  });

  it('returns null for free-text names it did not mint', () => {
    expect(
      parseFolderVariant({ name: 'Hafs 1442', name_ar: 'حفص ١٤٤٢', name_en: 'Hafs 1442' })
    ).toBeNull();
    expect(parseFolderVariant({ name: '256kbps', name_ar: null, name_en: '256kbps' })).toBeNull();
    expect(parseFolderVariant({ name: 'kbps 320', name_ar: null, name_en: 'kbps 320' })).toBeNull();
    expect(parseFolderVariant({ name: '', name_ar: null, name_en: null })).toBeNull();
  });
});

describe('takenFolderVariantKeys', () => {
  it('reserves original-without-effects for an unclassified default folder', () => {
    const taken = takenFolderVariantKeys([makeFolder({ is_default: true })]);
    expect(
      taken.has(folderVariantKey({ quality: RecitationFolderQuality.ORIGINAL, hasFx: false }))
    ).toBeTrue();
    expect(
      taken.has(folderVariantKey({ quality: RecitationFolderQuality.ORIGINAL, hasFx: true }))
    ).toBeFalse();
  });

  it('reserves the classified variant of a default folder when names match taxonomy', () => {
    const taken = takenFolderVariantKeys([
      makeFolder({
        is_default: true,
        name: '320kbps',
        name_ar: '320 كيلوبت',
        name_en: '320kbps',
      }),
    ]);
    expect(
      taken.has(folderVariantKey({ quality: RecitationFolderQuality.KBPS_320, hasFx: false }))
    ).toBeTrue();
    expect(
      taken.has(folderVariantKey({ quality: RecitationFolderQuality.ORIGINAL, hasFx: false }))
    ).toBeFalse();
  });

  it('collects classified folders and skips free-text ones', () => {
    const taken = takenFolderVariantKeys([
      makeFolder({ is_default: true }),
      makeFolder({ id: 2, slug: '320kbps', name_ar: '320 كيلوبت', name_en: '320kbps' }),
      makeFolder({ id: 3, slug: 'hafs-1442', name_ar: 'حفص', name_en: 'Hafs 1442' }),
    ]);
    expect(taken.size).toBe(2);
    expect(
      taken.has(folderVariantKey({ quality: RecitationFolderQuality.KBPS_320, hasFx: false }))
    ).toBeTrue();
  });

  it('excludes the folder being edited so its own variant stays selectable', () => {
    const folders = [
      makeFolder({ is_default: true }),
      makeFolder({ id: 2, slug: '320kbps', name_ar: '320 كيلوبت', name_en: '320kbps' }),
    ];
    const taken = takenFolderVariantKeys(folders, '320kbps');
    expect(
      taken.has(folderVariantKey({ quality: RecitationFolderQuality.KBPS_320, hasFx: false }))
    ).toBeFalse();
  });
});

describe('isFolderVisible / canToggleFolderVisibility', () => {
  it('reads a missing is_visible field as public, matching the current API', () => {
    expect(isFolderVisible(makeFolder())).toBeTrue();
    expect(isFolderVisible(makeFolder({ is_visible: true }))).toBeTrue();
    expect(isFolderVisible(makeFolder({ is_visible: false }))).toBeFalse();
  });

  it('never allows hiding the default folder, which public reads fall back to', () => {
    expect(canToggleFolderVisibility(makeFolder({ is_default: true }))).toBeFalse();
    expect(canToggleFolderVisibility(makeFolder({ is_default: false }))).toBeTrue();
  });
});

describe('canSetFolderAsDefault', () => {
  it('allows visible non-default folders only', () => {
    expect(canSetFolderAsDefault(makeFolder({ is_default: false, is_visible: true }))).toBeTrue();
    expect(canSetFolderAsDefault(makeFolder({ is_default: true }))).toBeFalse();
    expect(canSetFolderAsDefault(makeFolder({ is_default: false, is_visible: false }))).toBeFalse();
  });
});

describe('canEditFolderVariant', () => {
  it('always allows editing the default folder, even with tracks', () => {
    expect(canEditFolderVariant(makeFolder({ is_default: true, tracks_count: 114 }))).toBeTrue();
  });

  it('always allows classifying a free-text folder', () => {
    expect(
      canEditFolderVariant(
        makeFolder({ name: 'Hafs 1442', name_ar: 'حفص', name_en: 'Hafs 1442', tracks_count: 80 })
      )
    ).toBeTrue();
  });

  it('locks a classified folder once it holds audio', () => {
    const classified = makeFolder({ slug: '320kbps', name_ar: '320 كيلوبت', name_en: '320kbps' });
    expect(canEditFolderVariant({ ...classified, tracks_count: 0 })).toBeTrue();
    expect(canEditFolderVariant({ ...classified, tracks_count: 1 })).toBeFalse();
  });
});
