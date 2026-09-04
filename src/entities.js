// Slime level definitions and physics-body factory.
// Stage 1 has no merge logic — levels only describe size/appearance/physics.

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

// Only the first 4 levels are ever dropped by the spawner in this stage.
export const SPAWNABLE_LEVEL_COUNT = 4;

export function randomSpawnLevel() {
  return Math.floor(Math.random() * SPAWNABLE_LEVEL_COUNT);
}

/**
 * Creates a dynamic Matter.js circle body for a slime, plus a lightweight
 * render-facing wrapper. The wrapper is what render.js iterates over each
 * frame to read the synced position/angle from the physics body.
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
  });

  return {
    body,
    level: def.level,
    radius: def.radius,
    color: def.color,
  };
}
