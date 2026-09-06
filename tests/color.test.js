import { describe, it, expect } from 'vitest';
import { lighten, darken } from '../src/color.js';

describe('lighten', () => {
  it('mixes fully toward white at amount 1', () => {
    expect(lighten('#000000', 1)).toBe('#ffffff');
  });

  it('is a no-op at amount 0', () => {
    expect(lighten('#336699', 0)).toBe('#336699');
  });

  it('produces a lighter color than the input for amount between 0 and 1', () => {
    const result = lighten('#334455', 0.5);
    // Just check it moved toward white on each channel, not exact bytes.
    expect(parseInt(result.slice(1, 3), 16)).toBeGreaterThan(0x33);
    expect(parseInt(result.slice(3, 5), 16)).toBeGreaterThan(0x44);
    expect(parseInt(result.slice(5, 7), 16)).toBeGreaterThan(0x55);
  });
});

describe('darken', () => {
  it('mixes fully toward black at amount 1', () => {
    expect(darken('#ffffff', 1)).toBe('#000000');
  });

  it('is a no-op at amount 0', () => {
    expect(darken('#336699', 0)).toBe('#336699');
  });
});
