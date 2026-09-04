// Purely visual slime animation: landing squash & stretch, idle breathing,
// and the merge pop-in scale-up. None of this touches physics bodies —
// everything here only feeds a render-time transform (see render.js).

import Matter from 'matter-js';

const { Events } = Matter;

// --- Landing squash & stretch -----------------------------------------

const SQUASH_DURATION_MS = 180;
const BASE_SQUASH_AMOUNT = 0.28;
const MIN_SQUASH_FACTOR = 0.3;
// Impact speed (Matter units) at/above which a landing gets the full squash.
const SQUASH_SPEED_FOR_MAX = 9;

/**
 * Wires a collisionStart handler that kicks off a squash animation on any
 * slime involved in a fresh impact (floor, wall, or another slime) — this
 * is deliberately separate from merge.js's own collisionStart handler;
 * Matter calls every registered handler for the same event.
 */
export function setupLandingSquash(engine) {
  Events.on(engine, 'collisionStart', (event) => {
    const now = performance.now();
    for (const pair of event.pairs) {
      const impactSpeed = Math.max(pair.bodyA.speed, pair.bodyB.speed);
      triggerSquash(pair.bodyA, impactSpeed, now);
      triggerSquash(pair.bodyB, impactSpeed, now);
    }
  });
}

function triggerSquash(body, impactSpeed, now) {
  const wrapper = body.plugin && body.plugin.wrapper;
  if (!wrapper) return;
  const factor = Math.max(MIN_SQUASH_FACTOR, Math.min(1, impactSpeed / SQUASH_SPEED_FOR_MAX));
  wrapper.squashStartTime = now;
  wrapper.squashAmount = BASE_SQUASH_AMOUNT * factor;
}

/**
 * Current squash deformation for `slime` at time `now`: 0 means neutral,
 * positive means squashed flat (wider than tall). Eases back to 0 over
 * SQUASH_DURATION_MS with an ease-out cubic.
 */
export function getSquashAmount(slime, now) {
  if (slime.squashStartTime == null) return 0;
  const t = Math.min(1, (now - slime.squashStartTime) / SQUASH_DURATION_MS);
  if (t >= 1) return 0;
  const eased = 1 - (1 - t) ** 3;
  return slime.squashAmount * (1 - eased);
}

// --- Idle breathing ------------------------------------------------------

const IDLE_AMPLITUDE = 0.035;
const IDLE_PERIOD_MS = 2600;
// Below this Matter "speed" a slime is considered at rest for breathing
// purposes — fast-moving/falling slimes skip idle wobble entirely.
const IDLE_SPEED_THRESHOLD = 0.08;

/** Small sinusoidal squash/stretch for a resting slime; 0 while it's moving. */
export function getIdleAmount(slime, now) {
  if (slime.body.speed > IDLE_SPEED_THRESHOLD) return 0;
  const angle = (now / IDLE_PERIOD_MS) * Math.PI * 2 + slime.idlePhase;
  return IDLE_AMPLITUDE * Math.sin(angle);
}

// --- Merge pop-in ----------------------------------------------------------

const POP_DURATION_MS = 260;
const POP_START_SCALE = 0.25;

/** Uniform scale-up for a freshly merged slime, 1 once the pop has finished. */
export function getPopScale(slime, now) {
  if (slime.spawnedAt == null) return 1;
  const t = Math.min(1, (now - slime.spawnedAt) / POP_DURATION_MS);
  if (t >= 1) return 1;
  const eased = 1 - (1 - t) ** 3;
  return POP_START_SCALE + (1 - POP_START_SCALE) * eased;
}

/**
 * Combines squash/idle/pop into the final (scaleX, scaleY) render.js should
 * apply for `slime` this frame.
 */
export function getSlimeRenderScale(slime, now) {
  const deform = getSquashAmount(slime, now) + getIdleAmount(slime, now);
  const pop = getPopScale(slime, now);
  return { scaleX: pop * (1 + deform), scaleY: pop * (1 - deform) };
}
