import { preferredLanguage } from './preferred-language.util';

describe('preferredLanguage', () => {
  it('picks the UI language when the asset offers it', () => {
    // Arrange / Act / Assert
    expect(preferredLanguage(['ar', 'en'], 'en')).toBe('en');
  });

  it('falls back to the first language otherwise', () => {
    // Arrange / Act / Assert
    expect(preferredLanguage(['ar', 'fr'], 'en')).toBe('ar');
  });

  it('is null when the asset has no languages', () => {
    // Arrange / Act / Assert
    expect(preferredLanguage([], 'en')).toBeNull();
  });
});
