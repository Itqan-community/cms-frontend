import { FormControl } from '@angular/forms';
import { assetSlugValidators } from './asset-slug.util';

describe('assetSlugValidators', () => {
  const valid = (category: string, value: string): boolean =>
    new FormControl(value, assetSlugValidators(category)).valid;

  it('accepts a slug that starts with its asset type', () => {
    expect(valid('tafsir', 'tafsir-ibn-kathir')).toBeTrue();
    expect(valid('recitation', 'recitation-saad-al-ghamdi-hafs')).toBeTrue();
  });

  it('rejects a slug with another or no asset type prefix', () => {
    expect(valid('tafsir', 'mushaf-madinah')).toBeFalse();
    expect(valid('tafsir', 'ibn-kathir')).toBeFalse();
    expect(valid('font', 'fonts-uthmani')).toBeFalse();
  });

  it('rejects malformed or missing slugs', () => {
    expect(valid('tafsir', '')).toBeFalse();
    expect(valid('tafsir', 'Tafsir-Ibn')).toBeFalse();
    expect(valid('tafsir', 'tafsir--ibn')).toBeFalse();
    expect(valid('tafsir', `tafsir-${'x'.repeat(50)}`)).toBeFalse();
  });
});
