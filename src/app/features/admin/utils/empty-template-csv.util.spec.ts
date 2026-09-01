import { buildEmptyTemplateRows, emptyTemplateToCsv } from './empty-template-csv.util';

describe('buildEmptyTemplateRows', () => {
  it('builds ayah rows with empty editable fields', () => {
    const rows = buildEmptyTemplateRows('ayah', {
      ayahs: [
        {
          id: 1,
          chapter: 1,
          number: 1,
          text: 'بسم الله',
          textWithoutTashkil: 'بسم الله',
          searchableText: '',
          page_number: 1,
          surah_name: 'الفاتحة',
        },
      ],
    });
    expect(rows).toEqual([
      {
        sura: '1',
        aya: '1',
        surah_name: 'الفاتحة',
        uthmani: 'بسم الله',
        text: '',
        footnotes: '',
      },
    ]);
  });

  it('builds surah rows', () => {
    const rows = buildEmptyTemplateRows('surah', {
      surahs: [
        {
          surah_number: 1,
          name_ar: 'الفاتحة',
          name_en: 'Al-Fatiha',
          ayahs_count: 7,
          revelation_type: 'meccan',
        },
      ],
    });
    expect(rows[0]['sura']).toBe('1');
    expect(rows[0]['text']).toBe('');
  });
});

describe('emptyTemplateToCsv', () => {
  it('includes header row', () => {
    const csv = emptyTemplateToCsv('surah', [
      { sura: '1', surah_name: 'x', text: '', footnotes: '' },
    ]);
    expect(csv.startsWith('sura,surah_name,text,footnotes')).toBeTrue();
  });
});
