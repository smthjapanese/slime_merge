// Shared game state. Currently just the score — no UI reads this yet,
// that's wired up in a later stage.

let totalScore = 0;

export function getScore() {
  return totalScore;
}

export function addScore(points) {
  totalScore += points;
  return totalScore;
}

export function resetScore() {
  totalScore = 0;
}
