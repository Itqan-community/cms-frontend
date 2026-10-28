import { groupNameOrdering } from './groups.models';

describe('groupNameOrdering', () => {
  it('sorts by the Arabic name when the UI is Arabic', () => {
    expect(groupNameOrdering('ar')).toBe('name_ar');
  });

  it('sorts by the English name otherwise', () => {
    expect(groupNameOrdering('en')).toBe('name_en');
    expect(groupNameOrdering(undefined)).toBe('name_en');
  });
});
