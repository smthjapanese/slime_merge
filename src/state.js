// Shared game state: score, the combo streak, and the game-over flag. The
// UI (ui.js) subscribes to score changes here instead of polling it every
// frame.

let totalScore = 0;
let isGameOver = false;

const scoreListeners = [];

// A "combo" is a run of merges close enough together in time to count as a
// chain (typically one drop triggering several merges as things settle).
// Each merge inside the window bumps the streak and multiplies its own
// score; a gap longer than the window starts a fresh streak at 1.
const COMBO_WINDOW_MS = 800;
let comboCount = 0;
let lastMergeAt = -Infinity;

/**
 * Call once per merge with the current timestamp. Returns the streak count
 * this merge is part of (1 for a merge with nothing recent before it).
 */
export function registerMergeForCombo(now) {
  comboCount = now - lastMergeAt <= COMBO_WINDOW_MS ? comboCount + 1 : 1;
  lastMergeAt = now;
  return comboCount;
}

export function getCombo() {
  return comboCount;
}

export function resetCombo() {
  comboCount = 0;
  lastMergeAt = -Infinity;
}

export function getScore() {
  return totalScore;
}

export function addScore(points) {
  totalScore += points;
  notifyScoreListeners();
  return totalScore;
}

export function resetScore() {
  totalScore = 0;
  notifyScoreListeners();
}

/** Registers `listener(score)` to be called whenever the score changes. */
export function onScoreChange(listener) {
  scoreListeners.push(listener);
}

function notifyScoreListeners() {
  for (const listener of scoreListeners) listener(totalScore);
}

export function isGameOverActive() {
  return isGameOver;
}

export function setGameOver(value) {
  isGameOver = value;
}
