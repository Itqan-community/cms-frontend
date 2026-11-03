import {
  RecitationQualityBitrate,
  type RecitationQualityOut,
} from '../models/recitation-qualities.models';
import {
  QUALITY_BITRATE_ORDER,
  canEditQualityVariant,
  canSetQualityAsDefault,
  canToggleQualityVisibility,
  qualityDisplayName,
  qualityVariantKey,
  formatQualityVariantNames,
  isQualityVisible,
  parseQualityVariant,
  takenQualityVariantKeys,
} from './recitation-quality.util';

function makeQuality(overrides: Partial<RecitationQualityOut> = {}): RecitationQualityOut {
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

const allVariants = QUALITY_BITRATE_ORDER.flatMap((quality) => [
  { quality, hasFx: false },
  { quality, hasFx: true },
]);

describe('qualityDisplayName', () => {
  it('prefers the active language and falls back to the other name', () => {
    const quality = makeQuality({ name_ar: 'مع مؤثرات', name_en: 'With effects' });
    expect(qualityDisplayName(quality, 'en')).toBe('With effects');
    expect(qualityDisplayName(quality, 'ar')).toBe('مع مؤثرات');
    expect(qualityDisplayName({ ...quality, name_en: null }, 'en')).toBe('مع مؤثرات');
    expect(qualityDisplayName({ ...quality, name_ar: '' }, 'ar')).toBe('With effects');
  });

  it('falls back to the unlocalized name when both localized names are blank', () => {
    const quality = makeQuality({ name: '128kbps', name_ar: null, name_en: null });
    expect(qualityDisplayName(quality, 'en')).toBe('128kbps');
    expect(qualityDisplayName(quality, 'ar')).toBe('128kbps');
  });
});

describe('formatQualityVariantNames / parseQualityVariant round trip', () => {
  it('parses back every variant it can generate', () => {
    for (const variant of allVariants) {
      const names = formatQualityVariantNames(variant);
      const parsed = parseQualityVariant({
        name: names.name_en,
        name_ar: names.name_ar,
        name_en: names.name_en,
      });
      expect(parsed).withContext(qualityVariantKey(variant)).toEqual(variant);
    }
  });

  it('produces a distinct name pair for every variant', () => {
    const arabic = new Set(allVariants.map((v) => formatQualityVariantNames(v).name_ar));
    const english = new Set(allVariants.map((v) => formatQualityVariantNames(v).name_en));
    expect(arabic.size).toBe(allVariants.length);
    expect(english.size).toBe(allVariants.length);
  });

  it('names bitrate variants so the backend slug stays readable', () => {
    expect(
      formatQualityVariantNames({ quality: RecitationQualityBitrate.KBPS_320, hasFx: true })
    ).toEqual({ name_ar: '320 كيلوبت بالمؤثرات', name_en: '320kbps with effects' });
    expect(
      formatQualityVariantNames({ quality: RecitationQualityBitrate.KBPS_128, hasFx: false })
    ).toEqual({ name_ar: '128 كيلوبت', name_en: '128kbps' });
  });

  it('names the effects-only variant without a bitrate', () => {
    expect(
      formatQualityVariantNames({ quality: RecitationQualityBitrate.ORIGINAL, hasFx: true })
    ).toEqual({ name_ar: 'بالمؤثرات', name_en: 'With effects' });
  });

  it('recognises a variant from either language alone', () => {
    expect(parseQualityVariant({ name: '', name_ar: '192 كيلوبت', name_en: null })).toEqual({
      quality: RecitationQualityBitrate.KBPS_192,
      hasFx: false,
    });
    expect(
      parseQualityVariant({ name: '', name_ar: null, name_en: '64kbps with effects' })
    ).toEqual({
      quality: RecitationQualityBitrate.KBPS_64,
      hasFx: true,
    });
  });

  it('ignores surrounding whitespace and letter case', () => {
    expect(
      parseQualityVariant({ name: '  320KBPS With Effects  ', name_ar: null, name_en: null })
    ).toEqual({ quality: RecitationQualityBitrate.KBPS_320, hasFx: true });
  });

  it('returns null for free-text names it did not mint', () => {
    expect(
      parseQualityVariant({ name: 'Hafs 1442', name_ar: 'حفص ١٤٤٢', name_en: 'Hafs 1442' })
    ).toBeNull();
    expect(parseQualityVariant({ name: '256kbps', name_ar: null, name_en: '256kbps' })).toBeNull();
    expect(
      parseQualityVariant({ name: 'kbps 320', name_ar: null, name_en: 'kbps 320' })
    ).toBeNull();
    expect(parseQualityVariant({ name: '', name_ar: null, name_en: null })).toBeNull();
  });
});

describe('takenQualityVariantKeys', () => {
  it('reserves original-without-effects for an unclassified default quality', () => {
    const taken = takenQualityVariantKeys([makeQuality({ is_default: true })]);
    expect(
      taken.has(qualityVariantKey({ quality: RecitationQualityBitrate.ORIGINAL, hasFx: false }))
    ).toBeTrue();
    expect(
      taken.has(qualityVariantKey({ quality: RecitationQualityBitrate.ORIGINAL, hasFx: true }))
    ).toBeFalse();
  });

  it('reserves the classified variant of a default quality when names match taxonomy', () => {
    const taken = takenQualityVariantKeys([
      makeQuality({
        is_default: true,
        name: '320kbps',
        name_ar: '320 كيلوبت',
        name_en: '320kbps',
      }),
    ]);
    expect(
      taken.has(qualityVariantKey({ quality: RecitationQualityBitrate.KBPS_320, hasFx: false }))
    ).toBeTrue();
    expect(
      taken.has(qualityVariantKey({ quality: RecitationQualityBitrate.ORIGINAL, hasFx: false }))
    ).toBeFalse();
  });

  it('collects classified qualities and skips free-text ones', () => {
    const taken = takenQualityVariantKeys([
      makeQuality({ is_default: true }),
      makeQuality({ id: 2, slug: '320kbps', name_ar: '320 كيلوبت', name_en: '320kbps' }),
      makeQuality({ id: 3, slug: 'hafs-1442', name_ar: 'حفص', name_en: 'Hafs 1442' }),
    ]);
    expect(taken.size).toBe(2);
    expect(
      taken.has(qualityVariantKey({ quality: RecitationQualityBitrate.KBPS_320, hasFx: false }))
    ).toBeTrue();
  });

  it('excludes the quality being edited so its own variant stays selectable', () => {
    const qualities = [
      makeQuality({ is_default: true }),
      makeQuality({ id: 2, slug: '320kbps', name_ar: '320 كيلوبت', name_en: '320kbps' }),
    ];
    const taken = takenQualityVariantKeys(qualities, '320kbps');
    expect(
      taken.has(qualityVariantKey({ quality: RecitationQualityBitrate.KBPS_320, hasFx: false }))
    ).toBeFalse();
  });
});

describe('isQualityVisible / canToggleQualityVisibility', () => {
  it('reads a missing is_visible field as public, matching the current API', () => {
    expect(isQualityVisible(makeQuality())).toBeTrue();
    expect(isQualityVisible(makeQuality({ is_visible: true }))).toBeTrue();
    expect(isQualityVisible(makeQuality({ is_visible: false }))).toBeFalse();
  });

  it('never allows hiding the default quality, which public reads fall back to', () => {
    expect(canToggleQualityVisibility(makeQuality({ is_default: true }))).toBeFalse();
    expect(canToggleQualityVisibility(makeQuality({ is_default: false }))).toBeTrue();
  });
});

describe('canSetQualityAsDefault', () => {
  it('allows visible non-default qualities only', () => {
    expect(canSetQualityAsDefault(makeQuality({ is_default: false, is_visible: true }))).toBeTrue();
    expect(canSetQualityAsDefault(makeQuality({ is_default: true }))).toBeFalse();
    expect(
      canSetQualityAsDefault(makeQuality({ is_default: false, is_visible: false }))
    ).toBeFalse();
  });
});

describe('canEditQualityVariant', () => {
  it('allows editing any quality regardless of default status or track count', () => {
    expect(canEditQualityVariant(makeQuality({ is_default: true, tracks_count: 114 }))).toBeTrue();
    expect(
      canEditQualityVariant(
        makeQuality({
          is_default: false,
          slug: '320kbps',
          name_ar: '320 كيلوبت',
          name_en: '320kbps',
          tracks_count: 40,
        })
      )
    ).toBeTrue();
    expect(
      canEditQualityVariant(
        makeQuality({ name: 'Hafs 1442', name_ar: 'حفص', name_en: 'Hafs 1442', tracks_count: 80 })
      )
    ).toBeTrue();
  });
});
