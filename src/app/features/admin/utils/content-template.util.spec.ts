import {
  DEFAULT_CONTENT_TEMPLATE,
  buildContentColumnDefs,
  contentEntryKey,
  getContentTemplateDescriptor,
} from './content-template.util';

describe('getContentTemplateDescriptor', () => {
  it('defaults to ayah template', () => {
    const d = getContentTemplateDescriptor(DEFAULT_CONTENT_TEMPLATE);
    expect(d.template).toBe('ayah');
    expect(d.keyFields).toEqual(['sura', 'aya']);
    expect(d.editableFields).toEqual(['text', 'footnotes']);
  });

  it('defines page template key fields', () => {
    const d = getContentTemplateDescriptor('page');
    expect(d.keyFields).toEqual(['page_number']);
    expect(d.csvHeaders).toContain('juz_number');
  });

  it('defines word template key fields', () => {
    const d = getContentTemplateDescriptor('word');
    expect(d.keyFields).toEqual(['sura', 'aya', 'word_position']);
  });
});

describe('buildContentColumnDefs', () => {
  it('marks editable columns for ayah template', () => {
    const cols = buildContentColumnDefs('ayah', (k) => k);
    const textCol = cols.find((c) => c.field === 'text');
    const suraCol = cols.find((c) => c.field === 'sura');
    expect(textCol?.editable).toBeTrue();
    expect(suraCol?.editable).toBeFalse();
  });
});

describe('contentEntryKey', () => {
  it('builds ayah key', () => {
    expect(
      contentEntryKey('ayah', {
        id: 1,
        ayah_id: 10,
        sura: 2,
        aya: 255,
        surah_name: 'البقرة',
        uthmani: 'x',
        text: '',
        footnotes: '',
        order: 1,
      })
    ).toBe('2:255');
  });
});
