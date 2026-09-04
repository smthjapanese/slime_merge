// Slime level definitions and physics-body factory.

import Matter from 'matter-js';

const { Bodies } = Matter;

// 8 slime levels, radius growing from 18px to 90px.
// `density` is tuned per level so bigger slimes don't become absurdly heavy
// relative to their size (pure area-scaling would make level 8 ~25x level 1's mass).
export const SLIME_LEVELS = [
  { level: 0, radius: 18, color: '#ff6b6b', density: 0.0025 },
  { level: 1, radius: 26, color: '#ffa94d', density: 0.0022 },
  { level: 2, radius: 34, color: '#ffd43b', density: 0.0019 },
  { level: 3, radius: 44, color: '#a9e34b', density: 0.0016 },
  { level: 4, radius: 54, color: '#63e6be', density: 0.0014 },
  { level: 5, radius: 64, color: '#4dabf7', density: 0.0012 },
  { level: 6, radius: 76, color: '#9775fa', density: 0.001 },
  { level: 7, radius: 90, color: '#f783ac', density: 0.0008 },
];

export const MAX_LEVEL_INDEX = SLIME_LEVELS.length - 1;

// Only the first 4 levels are ever dropped by the spawner. Weighted so lower
// levels drop more often (index 0 = human "level 1", most common).
const SPAWN_WEIGHTS = [0.4, 0.3, 0.2, 0.1];

export function randomSpawnLevel() {
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < SPAWN_WEIGHTS.length; i += 1) {
    cumulative += SPAWN_WEIGHTS[i];
    if (roll < cumulative) return i;
  }
  // Guards against floating-point rounding leaving a tiny gap at roll ~= 1.
  return SPAWN_WEIGHTS.length - 1;
}

/**
 * Creates a dynamic Matter.js circle body for a slime, plus a lightweight
 * render-facing wrapper. The wrapper is what render.js iterates over each
 * frame to read the synced position/angle from the physics body.
 *
 * The body's `plugin.wrapper` back-reference and `plugin.merging` flag let
 * merge.js resolve a collision pair straight back to its slime wrapper
 * without keeping a separate body->wrapper lookup table in sync.
 */
export function createSlime(levelIndex, x, y) {
  const def = SLIME_LEVELS[levelIndex];
  if (!def) {
    throw new Error(`Unknown slime level: ${levelIndex}`);
  }

  const body = Bodies.circle(x, y, def.radius, {
    restitution: 0.2,
    friction: 0.5,
    density: def.density,
    label: `slime-${def.level}`,
    plugin: { merging: false },
  });

  const slime = {
    body,
    level: def.level,
    radius: def.radius,
    color: def.color,
    // Random phase so idle-breathing slimes don't all pulse in lockstep.
    idlePhase: Math.random() * Math.PI * 2,
    // Animation state (read/written by animation.js): squashStartTime +
    // squashAmount drive the landing squash-and-stretch, spawnedAt drives
    // the merge pop-in scale-up. All left undefined until an event sets them.
    squashStartTime: null,
    squashAmount: 0,
    spawnedAt: null,
  };
  body.plugin.wrapper = slime;

  return slime;
}
