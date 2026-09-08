import { describe, it, expect, beforeEach } from 'vitest';
import Matter from 'matter-js';
import { createPhysicsWorld } from '../src/physics.js';
import { createSlime, SLIME_LEVELS, MAX_LEVEL_INDEX } from '../src/entities.js';
import { setupMergeHandling } from '../src/merge.js';
import { getScore, resetScore } from '../src/state.js';

const { World, Engine } = Matter;

function freshWorld() {
  resetScore();
  const { engine, world } = createPhysicsWorld();
  const slimes = [];
  const effects = [];
  setupMergeHandling(engine, world, slimes, effects);
  return { engine, world, slimes, effects };
}

function step(engine, times = 5) {
  for (let i = 0; i < times; i += 1) Engine.update(engine, 16.666);
}

beforeEach(() => {
  resetScore();
});

describe('merge', () => {
  it('merges two overlapping same-level slimes into the next level, scoring 2**(newLevel+1)', () => {
    const { engine, world, slimes } = freshWorld();
    const a = createSlime(0, 100, 100);
    const b = createSlime(0, 118, 100); // overlapping (radius 18 each)
    World.add(world, [a.body, b.body]);
    slimes.push(a, b);

    step(engine);

    expect(slimes).toHaveLength(1);
    expect(slimes[0].level).toBe(1);
    expect(getScore()).toBe(4); // 2**(1+1)
  });

  it('does not merge slimes of different levels even when overlapping', () => {
    const { engine, world, slimes } = freshWorld();
    const a = createSlime(0, 100, 100);
    const b = createSlime(1, 118, 100);
    World.add(world, [a.body, b.body]);
    slimes.push(a, b);

    step(engine);

    expect(slimes).toHaveLength(2);
    expect(getScore()).toBe(0);
  });

  it('guards against a body joining two merges in the same collision frame', () => {
    const { engine, world, slimes } = freshWorld();
    const a = createSlime(0, 100, 100);
    const b = createSlime(0, 118, 100);
    const c = createSlime(0, 136, 100);
    World.add(world, [a.body, b.body, c.body]);
    slimes.push(a, b, c);

    step(engine);

    // Only one pair may merge this frame; the third slime sits out.
    expect(slimes).toHaveLength(2);
    expect(slimes.map((s) => s.level).sort()).toEqual([0, 1]);
    expect(getScore()).toBe(4);
  });

  it('at max level, merging removes both slimes and only awards a score bonus (no new slime)', () => {
    const { engine, world, slimes } = freshWorld();
    const maxDef = SLIME_LEVELS[MAX_LEVEL_INDEX];
    const a = createSlime(MAX_LEVEL_INDEX, 150, 150);
    const b = createSlime(MAX_LEVEL_INDEX, 150 + maxDef.radius, 150);
    World.add(world, [a.body, b.body]);
    slimes.push(a, b);

    step(engine);

    expect(slimes).toHaveLength(0);
    expect(getScore()).toBe(2 ** (MAX_LEVEL_INDEX + 2));
  });

  it('pushes a flash and a burst effect at the midpoint of the merged pair', () => {
    const { engine, world, slimes, effects } = freshWorld();
    const a = createSlime(0, 100, 100);
    const b = createSlime(0, 118, 100);
    World.add(world, [a.body, b.body]);
    slimes.push(a, b);

    step(engine);

    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect.x).toBeCloseTo(109, 0);
      expect(effect.y).toBeCloseTo(100, 0);
    }
    expect(effects.map((effect) => effect.type).sort()).toEqual(['burst', 'flash']);
  });
});
