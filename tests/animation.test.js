import { describe, it, expect } from 'vitest';
import { getSquashAmount, isResting, getPopScale, getSlimeRenderScale } from '../src/animation.js';

function fakeSlime(overrides = {}) {
  return {
    body: { speed: 0 },
    idlePhase: 0,
    squashStartTime: null,
    squashAmount: 0,
    spawnedAt: null,
    ...overrides,
  };
}

describe('getSquashAmount', () => {
  it('is 0 when no squash has been triggered', () => {
    expect(getSquashAmount(fakeSlime(), 1000)).toBe(0);
  });

  it('is at its full amount right when triggered, and eases back to 0', () => {
    const slime = fakeSlime({ squashStartTime: 1000, squashAmount: 0.3 });
    const atStart = getSquashAmount(slime, 1000);
    const midway = getSquashAmount(slime, 1090);
    const afterDuration = getSquashAmount(slime, 1200); // past the 180ms duration

    expect(atStart).toBeCloseTo(0.3, 5);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(atStart);
    expect(afterDuration).toBe(0);
  });
});

describe('isResting', () => {
  it('is true below the speed threshold and false above it', () => {
    expect(isResting(fakeSlime({ body: { speed: 0.01 } }))).toBe(true);
    expect(isResting(fakeSlime({ body: { speed: 5 } }))).toBe(false);
  });
});

describe('getPopScale', () => {
  it('is 1 for a slime with no spawnedAt (not a fresh merge)', () => {
    expect(getPopScale(fakeSlime(), 1000)).toBe(1);
  });

  it('starts below 1 right at spawn and eases up to 1', () => {
    const slime = fakeSlime({ spawnedAt: 1000 });
    const atStart = getPopScale(slime, 1000);
    const afterDuration = getPopScale(slime, 1400); // past the 260ms pop duration

    expect(atStart).toBeLessThan(1);
    expect(atStart).toBeGreaterThan(0);
    expect(afterDuration).toBe(1);
  });
});

describe('getSlimeRenderScale', () => {
  it('is neutral (1,1) for an untouched, resting slime with no idle wobble at its zero-crossing phase', () => {
    const slime = fakeSlime({ body: { speed: 0 }, idlePhase: 0 });
    // At t=0 the idle sine term is sin(0 + phase) — with phase 0 that's 0.
    const { scaleX, scaleY } = getSlimeRenderScale(slime, 0);
    expect(scaleX).toBeCloseTo(1, 5);
    expect(scaleY).toBeCloseTo(1, 5);
  });
});
