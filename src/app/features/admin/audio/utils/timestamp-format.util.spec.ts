import { formatDrift, formatNudgeStep, formatTimestamp } from './timestamp-format.util';

describe('formatTimestamp', () => {
  it('always shows milliseconds, because milliseconds are what is edited', () => {
    expect(formatTimestamp(201_480)).toBe('00:03:21.480');
  });

  it('pads every field', () => {
    expect(formatTimestamp(1)).toBe('00:00:00.001');
  });

  it('carries into hours for a long surah', () => {
    expect(formatTimestamp(7_384_120)).toBe('02:03:04.120');
  });

  it('rounds sub-millisecond values', () => {
    expect(formatTimestamp(1_000.6)).toBe('00:00:01.001');
  });

  it('clamps a negative value to zero rather than printing a negative clock', () => {
    expect(formatTimestamp(-5_000)).toBe('00:00:00.000');
  });

  it('shows an em dash when there is nothing to show', () => {
    expect(formatTimestamp(null)).toBe('—');
    expect(formatTimestamp(undefined)).toBe('—');
    expect(formatTimestamp(Number.NaN)).toBe('—');
  });
});

describe('formatDrift', () => {
  it('signs a forward move', () => {
    expect(formatDrift(120)).toBe('+120 ms');
  });

  it('keeps the minus on a backward move', () => {
    expect(formatDrift(-120)).toBe('-120 ms');
  });

  it('shows no sign at rest', () => {
    expect(formatDrift(0)).toBe('0 ms');
  });
});

describe('formatNudgeStep', () => {
  it('signs the step shown on the control', () => {
    expect(formatNudgeStep(10)).toBe('+10');
    expect(formatNudgeStep(-100)).toBe('-100');
  });
});
