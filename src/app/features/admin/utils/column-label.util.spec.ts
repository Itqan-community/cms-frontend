import { columnLabel } from './column-label.util';

describe('column-label.util', () => {
  const both = { key: 'answer', label_en: 'Answer', label_ar: 'الجواب' };

  it('uses the UI language label', () => {
    expect(columnLabel(both, 'ar')).toBe('الجواب');
    expect(columnLabel(both, 'en')).toBe('Answer');
  });

  it('falls back to the other label, then to the key', () => {
    expect(columnLabel({ key: 'answer', label_en: 'Answer', label_ar: '' }, 'ar')).toBe('Answer');
    expect(columnLabel({ key: 'answer', label_en: '', label_ar: 'الجواب' }, 'en')).toBe('الجواب');
    expect(columnLabel({ key: 'answer', label_en: '', label_ar: '' }, 'ar')).toBe('answer');
  });
});
