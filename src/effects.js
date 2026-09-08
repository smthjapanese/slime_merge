// One-off visual effects that aren't attached to any slime — a bright flash
// plus a colored particle burst, both played together at a merge point.
// Lives as a plain array owned by main.js, same pattern as the `slimes`
// array: other modules push/prune it in place. Each effect carries a `type`
// so render.js knows which draw function to dispatch to.

import { lighten, darken } from './color.js';

const FLASH_DURATION_MS = 280;

/** Creates a merge-flash effect record at (x, y) sized relative to `radius`. */
export function createMergeFlash(x, y, radius, now) {
  return { type: 'flash', x, y, radius, startedAt: now, duration: FLASH_DURATION_MS };
}

const BURST_DURATION_MS = 500;
const BURST_PARTICLE_COUNT = 14;

/**
 * Creates a merge-burst effect: a ring of small colored particles that fly
 * outward from (x, y) and fade, tinted around `color` (lightened/darkened
 * per-particle for a bit of sparkle variety) and scaled to `radius`. All
 * randomness (angle jitter, speed, size, shade) is resolved once here at
 * creation time, so drawing it every frame is pure, deterministic math.
 */
export function createMergeBurst(x, y, radius, color, now) {
  const particles = [];
  for (let i = 0; i < BURST_PARTICLE_COUNT; i += 1) {
    const angle = (i / BURST_PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = radius * (1.3 + Math.random() * 1.2);
    const size = radius * (0.1 + Math.random() * 0.09);
    const shadeRoll = Math.random();
    const particleColor =
      shadeRoll < 0.34 ? lighten(color, 0.4) : shadeRoll < 0.67 ? color : darken(color, 0.2);
    particles.push({ angle, speed, size, color: particleColor });
  }
  return { type: 'burst', x, y, particles, startedAt: now, duration: BURST_DURATION_MS };
}

/** Removes effects whose duration has fully elapsed. Mutates `effects` in place. */
export function pruneExpiredEffects(effects, now) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    if (now - effects[i].startedAt >= effects[i].duration) {
      effects.splice(i, 1);
    }
  }
}

/** 0-1 progress through the effect's lifetime, clamped. */
export function effectProgress(effect, now) {
  return Math.min(1, (now - effect.startedAt) / effect.duration);
}
