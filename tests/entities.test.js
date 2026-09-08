import { describe, it, expect } from 'vitest';
import {
  SLIME_LEVELS,
  MAX_LEVEL_INDEX,
  randomSpawnLevel,
  previewSlime,
  createSlime,
  WILDCARD_LEVEL,
} from '../src/entities.js';

function sampleDistribution(score, samples = 50000) {
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < samples; i += 1) counts[randomSpawnLevel(score)] += 1;
  return counts.map((c) => c / samples);
}

describe('SLIME_LEVELS', () => {
  it('has 8 levels with strictly increasing radius', () => {
    expect(SLIME_LEVELS).toHaveLength(8);
    expect(MAX_LEVEL_INDEX).toBe(7);
    for (let i = 1; i < SLIME_LEVELS.length; i += 1) {
      expect(SLIME_LEVELS[i].radius).toBeGreaterThan(SLIME_LEVELS[i - 1].radius);
    }
  });
});

describe('randomSpawnLevel', () => {
  it('matches the early-game weights (~40/30/20/10) at score 0', () => {
    const dist = sampleDistribution(0);
    expect(dist[0]).toBeCloseTo(0.4, 1);
    expect(dist[1]).toBeCloseTo(0.3, 1);
    expect(dist[2]).toBeCloseTo(0.2, 1);
    expect(dist[3]).toBeCloseTo(0.1, 1);
  });

  it('ramps to the harder weights (~15/25/30/30) once past the difficulty threshold', () => {
    const dist = sampleDistribution(10000);
    expect(dist[0]).toBeCloseTo(0.15, 1);
    expect(dist[1]).toBeCloseTo(0.25, 1);
    expect(dist[2]).toBeCloseTo(0.3, 1);
    expect(dist[3]).toBeCloseTo(0.3, 1);
  });

  it('only ever returns one of the first 4 levels', () => {
    for (let i = 0; i < 2000; i += 1) {
      const level = randomSpawnLevel(Math.random() * 5000);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(3);
    }
  });
});

describe('previewSlime', () => {
  it('returns the level metadata without creating a physics body', () => {
    const preview = previewSlime(2);
    expect(preview).toMatchObject({
      level: 2,
      radius: SLIME_LEVELS[2].radius,
      color: SLIME_LEVELS[2].color,
    });
    expect(['happy', 'neutral']).toContain(preview.expression);
    expect(preview.body).toBeUndefined();
  });

  it('throws for an out-of-range level, same as createSlime', () => {
    expect(() => previewSlime(99)).toThrow(/Unknown slime level/);
    expect(() => createSlime(99, 0, 0)).toThrow(/Unknown slime level/);
  });
});

describe('createSlime', () => {
  it('creates a body whose plugin.wrapper points back to the returned slime', () => {
    const slime = createSlime(0, 10, 20);
    expect(slime.body.plugin.wrapper).toBe(slime);
    expect(slime.body.plugin.merging).toBe(false);
    expect(slime.level).toBe(0);
    expect(slime.isWild).toBe(false);
  });
});

describe('wildcard bonus slime', () => {
  it('previewSlime(WILDCARD_LEVEL) returns a wild preview with a happy expression', () => {
    const preview = previewSlime(WILDCARD_LEVEL);
    expect(preview.isWild).toBe(true);
    expect(preview.expression).toBe('happy');
    expect(preview.body).toBeUndefined();
  });

  it('createSlime(WILDCARD_LEVEL, ...) creates a wired-up wild physics body', () => {
    const slime = createSlime(WILDCARD_LEVEL, 10, 20);
    expect(slime.isWild).toBe(true);
    expect(slime.body.plugin.wrapper).toBe(slime);
    expect(slime.body.plugin.merging).toBe(false);
  });
});
