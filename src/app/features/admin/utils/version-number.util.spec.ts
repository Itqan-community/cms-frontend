import { isVersionNumber, nextVersionNumber } from './version-number.util';

describe('version-number.util', () => {
  it('accepts major.minor numbers only', () => {
    expect(isVersionNumber('7.0')).toBeTrue();
    expect(isVersionNumber(' 12.34 ')).toBeTrue();
    expect(isVersionNumber('7')).toBeFalse();
    expect(isVersionNumber('7.0.1')).toBeFalse();
    expect(isVersionNumber('v7.0')).toBeFalse();
    expect(isVersionNumber('')).toBeFalse();
    expect(isVersionNumber(null)).toBeFalse();
  });

  it('bumps the minor number', () => {
    expect(nextVersionNumber('7.0', 'minor')).toBe('7.1');
    expect(nextVersionNumber('7.9', 'minor')).toBe('7.10');
  });

  it('bumps the major number and resets the minor', () => {
    expect(nextVersionNumber('7.3', 'major')).toBe('8.0');
  });

  it('returns null for a name that is not a version number', () => {
    expect(nextVersionNumber('First edition', 'minor')).toBeNull();
  });
});
