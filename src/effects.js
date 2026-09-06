// One-off visual effects that aren't attached to any slime — the merge
// flash and the floating "×N" combo text. Lives as a plain array owned by
// main.js, same pattern as the `slimes` array: other modules push/prune it
// in place. Each effect carries a `type` render.js switches on.

const FLASH_DURATION_MS = 280;
const COMBO_TEXT_DURATION_MS = 700;

/** Creates a merge-flash effect record at (x, y) sized relative to `radius`. */
export function createMergeFlash(x, y, radius, now) {
  return { type: 'flash', x, y, radius, startedAt: now, duration: FLASH_DURATION_MS };
}

/** Creates a floating "×N" combo-streak callout at (x, y). */
export function createComboText(x, y, combo, now) {
  return { type: 'combo', x, y, combo, startedAt: now, duration: COMBO_TEXT_DURATION_MS };
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
