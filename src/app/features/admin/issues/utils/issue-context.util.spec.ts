import {
  createIssueContextForm,
  formatIssueContext,
  issueContextFromForm,
  issueContextKind,
  setIssueContextRequired,
} from './issue-context.util';

describe('issue-context.util', () => {
  const translate = (lang: string) => ({
    currentLang: lang,
    instant: (key: string, params?: Record<string, unknown>) =>
      key === 'ISSUE_CONTEXT.PAGE_VALUE'
        ? `Page ${params?.['page']}`
        : key === 'ISSUE_CONTEXT.GLYPH_VALUE'
          ? `Glyph “${params?.['glyph']}”`
          : key,
  });

  it('maps each asset category to its location fields', () => {
    // Act / Assert
    expect(issueContextKind('recitation')).toBe('ayah');
    expect(issueContextKind('text')).toBe('ayah');
    expect(issueContextKind('mushaf')).toBe('page');
    expect(issueContextKind('font')).toBe('font');
    expect(issueContextKind('program')).toBeNull();
    expect(issueContextKind(null)).toBeNull();
  });

  it("keeps only the kind's filled-in fields", () => {
    // Arrange
    const form = createIssueContextForm();
    form.setValue({ surah: 2, ayah: 255, page: 4, glyph: '  ب ' });

    // Act / Assert
    expect(issueContextFromForm('ayah', form)).toEqual({ surah: 2, ayah: 255 });
    expect(issueContextFromForm('page', form)).toEqual({ page: 4 });
    expect(issueContextFromForm('font', form)).toEqual({ page: 4, glyph: 'ب' });
    expect(issueContextFromForm(null, form)).toBeNull();
  });

  it('sends null when no location is filled in', () => {
    // Arrange
    const form = createIssueContextForm();
    form.setValue({ surah: null, ayah: 3, page: null, glyph: '   ' });

    // Act / Assert
    expect(issueContextFromForm('ayah', form)).toBeNull();
    expect(issueContextFromForm('font', form)).toBeNull();
  });

  it('formats a location readably in the UI language', () => {
    // Act / Assert
    expect(formatIssueContext({ surah: 2, ayah: 255 }, translate('en'))).toBe('Al-Baqarah 2:255');
    expect(formatIssueContext({ surah: 2, ayah: 255 }, translate('ar'))).toBe('البقرة 2:255');
    expect(formatIssueContext({ surah: 114 }, translate('en'))).toBe('An-Nas (114)');
    expect(formatIssueContext({ page: 12 }, translate('en'))).toBe('Page 12');
    expect(formatIssueContext({ page: 3, glyph: 'ب' }, translate('en'))).toBe('Page 3 · Glyph “ب”');
  });

  it('formats a missing or unknown location as empty', () => {
    // Act / Assert
    expect(formatIssueContext(null, translate('en'))).toBe('');
    expect(formatIssueContext({ surah: 999 }, translate('en'))).toBe('');
  });

  it('requires surah and ayah, page, or page-or-glyph by kind', () => {
    // Arrange
    const form = createIssueContextForm();

    // Act / Assert
    setIssueContextRequired('ayah', form);
    expect(form.controls.surah.hasError('required')).toBeTrue();
    expect(form.controls.ayah.hasError('required')).toBeTrue();

    setIssueContextRequired('page', form);
    expect(form.controls.surah.valid).toBeTrue();
    expect(form.controls.page.hasError('required')).toBeTrue();

    setIssueContextRequired('font', form);
    expect(form.controls.page.valid).toBeTrue();
    expect(form.hasError('pageOrGlyph')).toBeTrue();
    form.controls.glyph.setValue('ب');
    form.updateValueAndValidity();
    expect(form.valid).toBeTrue();

    setIssueContextRequired(null, form);
    form.reset();
    expect(form.valid).toBeTrue();
  });

  it('leaves every field optional when not required (an older report)', () => {
    // Arrange
    const form = createIssueContextForm();

    // Act
    setIssueContextRequired('ayah', form, false);

    // Assert
    expect(form.valid).toBeTrue();
  });
});
