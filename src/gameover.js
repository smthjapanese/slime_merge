// Game-over detection: a slime that stays above the danger line continuously
// for too long ends the game.

import { DANGER_LINE_Y } from './physics.js';

const GAME_OVER_DELAY_MS = 1000;

/**
 * Call once per frame with the live `slimes` array and the current
 * timestamp (ms). Tracks each slime's own "time spent above the line" on
 * the wrapper itself (`aboveLineSince`), resetting it the moment the slime
 * dips back below. Returns true the first frame any slime has been above
 * the line continuously for GAME_OVER_DELAY_MS.
 */
export function checkGameOver(slimes, now) {
  for (const slime of slimes) {
    const isAboveLine = slime.body.position.y < DANGER_LINE_Y;

    if (!isAboveLine) {
      slime.aboveLineSince = null;
      continue;
    }

    if (slime.aboveLineSince == null) {
      slime.aboveLineSince = now;
    } else if (now - slime.aboveLineSince >= GAME_OVER_DELAY_MS) {
      return true;
    }
  }
  return false;
}
