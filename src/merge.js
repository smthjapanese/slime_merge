// Merge logic: detects same-level slime collisions and combines them into
// the next level up.

import Matter from 'matter-js';
import { MAX_LEVEL_INDEX, createSlime } from './entities.js';
import { addScore, registerMergeForCombo } from './state.js';
import { createMergeFlash, createComboText } from './effects.js';
import { triggerDizzy } from './face.js';
import { playMerge } from './sound.js';

const { Events, World } = Matter;

// Keeps the floating combo callout from rendering above the canvas edge
// when a merge happens near the top of the jar (close to the spawner).
const COMBO_TEXT_MIN_Y = 24;

/**
 * Wires collisionStart handling onto `engine`. `slimes` is the live array of
 * dropped slime wrappers owned by main.js — merges mutate it directly
 * (splicing out the merged pair, pushing the newly created slime) so the
 * render loop always reflects the current set without extra bookkeeping.
 * `effects` gets a flash pushed at the merge point (also owned by main.js).
 */
export function setupMergeHandling(engine, world, slimes, effects) {
  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      tryMerge(pair.bodyA, pair.bodyB, world, slimes, effects);
    }
  });
}

function tryMerge(bodyA, bodyB, world, slimes, effects) {
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
  const now = performance.now();

  World.remove(world, bodyA);
  World.remove(world, bodyB);
  removeFromArray(slimes, wrapperA);
  removeFromArray(slimes, wrapperB);

  let flashRadius = wrapperA.radius;
  if (currentLevel < MAX_LEVEL_INDEX) {
    const merged = createSlime(nextLevel, midX, midY);
    merged.spawnedAt = now; // drives the pop-in scale-up in animation.js
    triggerDizzy(merged, now); // dazed for a beat right after merging
    World.add(world, merged.body);
    slimes.push(merged);
    flashRadius = merged.radius;
  }
  effects.push(createMergeFlash(midX, midY, flashRadius, now));

  // A chain of merges close together in time (typically one drop settling
  // into several merges in a row) multiplies its own score and gets a
  // floating "×N" callout — see state.js's registerMergeForCombo.
  const combo = registerMergeForCombo(now);
  if (combo >= 2) {
    const comboTextY = Math.max(COMBO_TEXT_MIN_Y, midY - flashRadius - 12);
    effects.push(createComboText(midX, comboTextY, combo, now));
  }
  playMerge(nextLevel, combo);

  // Max level (SLIME_LEVELS.length): no new slime is spawned, just the
  // score bonus below, using human-numbered levels (1-indexed) throughout —
  // e.g. two level-1 slimes merging into level 2 score 2**2, multiplied by
  // the current combo streak.
  addScore(2 ** (nextLevel + 1) * combo);
}

function removeFromArray(array, item) {
  const index = array.indexOf(item);
  if (index !== -1) array.splice(index, 1);
}
