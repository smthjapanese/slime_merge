// Shared game state: score and the game-over flag. The UI (ui.js) subscribes
// to score changes here instead of polling it every frame.

let totalScore = 0;
let isGameOver = false;

const scoreListeners = [];

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
