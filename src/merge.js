// Merge logic: detects same-level slime collisions and combines them into
// the next level up.

import Matter from 'matter-js';
import { MAX_LEVEL_INDEX, createSlime } from './entities.js';
import { addScore } from './state.js';

const { Events, World } = Matter;

/**
 * Wires collisionStart handling onto `engine`. `slimes` is the live array of
 * dropped slime wrappers owned by main.js — merges mutate it directly
 * (splicing out the merged pair, pushing the newly created slime) so the
 * render loop always reflects the current set without extra bookkeeping.
 */
export function setupMergeHandling(engine, world, slimes) {
  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      tryMerge(pair.bodyA, pair.bodyB, world, slimes);
    }
  });
}

function tryMerge(bodyA, bodyB, world, slimes) {
  const wrapperA = bodyA.plugin && bodyA.plugin.wrapper;
  const wrapperB = bodyB.plugin && bodyB.plugin.wrapper;

  // One of the bodies is a wall (or anything without a slime wrapper).
  if (!wrapperA || !wrapperB) return;

  if (wrapperA.level !== wrapperB.level) return;

  // Chain-reaction guard: a body already claimed by another merge this frame
  // (from an earlier pair in the same collisionStart event) sits out.
  if (bodyA.plugin.merging || bodyB.plugin.merging) return;
  bodyA.plugin.merging = true;
  bodyB.plugin.merging = true;

  const currentLevel = wrapperA.level;
  const nextLevel = currentLevel + 1;
  const midX = (bodyA.position.x + bodyB.position.x) / 2;
  const midY = (bodyA.position.y + bodyB.position.y) / 2;

  World.remove(world, bodyA);
  World.remove(world, bodyB);
  removeFromArray(slimes, wrapperA);
  removeFromArray(slimes, wrapperB);

  if (currentLevel < MAX_LEVEL_INDEX) {
    const merged = createSlime(nextLevel, midX, midY);
    World.add(world, merged.body);
    slimes.push(merged);
  }
  // Max level (SLIME_LEVELS.length): no new slime is spawned, just the
  // score bonus below, using human-numbered levels (1-indexed) throughout —
  // e.g. two level-1 slimes merging into level 2 score 2**2.
  addScore(2 ** (nextLevel + 1));
}

function removeFromArray(array, item) {
  const index = array.indexOf(item);
  if (index !== -1) array.splice(index, 1);
}
