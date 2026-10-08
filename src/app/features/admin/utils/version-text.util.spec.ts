import {
  EMPTY_VERSION_TEXT,
  hasVersionSummary,
  localizedVersionText,
  trimVersionText,
} from './version-text.util';

describe('version text', () => {
  const text = { ...EMPTY_VERSION_TEXT, label_en: 'First', label_ar: 'الأولى', summary_ar: 'ملخص' };

  it('shows the UI language first', () => {
    expect(localizedVersionText(text, 'label', 'ar')).toBe('الأولى');
    expect(localizedVersionText(text, 'label', 'en')).toBe('First');
  });

  it('falls back to the other language when the UI one is empty', () => {
    expect(localizedVersionText(text, 'summary', 'en')).toBe('ملخص');
  });

  it('is empty when neither language is set', () => {
    expect(localizedVersionText(null, 'label', 'en')).toBe('');
  });

  it('needs a summary in at least one language', () => {
    expect(hasVersionSummary(text)).toBeTrue();
    expect(hasVersionSummary({ summary_en: '  ', summary_ar: '' })).toBeFalse();
  });

  it('trims every field', () => {
    expect(trimVersionText({ ...EMPTY_VERSION_TEXT, label_en: ' a ', summary_ar: ' ب ' })).toEqual({
      ...EMPTY_VERSION_TEXT,
      label_en: 'a',
      summary_ar: 'ب',
    });
  });
});
