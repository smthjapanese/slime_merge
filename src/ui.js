// DOM overlay: score readout, next-slime preview, danger line and the
// game-over screen. Pure DOM/CSS here — no physics or game rules.

import { onScoreChange, getScore } from './state.js';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  JAR_LEFT,
  JAR_WIDTH,
  DANGER_LINE_Y,
} from './physics.js';

const stage = document.getElementById('stage');
const scoreValueEl = document.getElementById('score-value');
const nextPreviewEl = document.getElementById('next-preview-circle');
const dangerLineEl = document.getElementById('danger-line');
const gameOverEl = document.getElementById('game-over');
const finalScoreValueEl = document.getElementById('final-score-value');
const bestScoreValueEl = document.getElementById('best-score-value');
const restartButton = document.getElementById('restart-button');

// Leaves a small margin around the scaled stage so it never touches the
// screen edges exactly.
const VIEWPORT_MARGIN = 0.96;

export function initUI({ onRestart }) {
  onScoreChange((score) => {
    scoreValueEl.textContent = String(score);
  });
  scoreValueEl.textContent = String(getScore());

  restartButton.addEventListener('click', onRestart);

  // The danger line's position is fixed in logical coordinates, same as the
  // jar itself, so it only needs to be placed once — the whole stage
  // (canvas + overlay) scales together as one unit on resize.
  dangerLineEl.style.left = `${JAR_LEFT}px`;
  dangerLineEl.style.width = `${JAR_WIDTH}px`;
  dangerLineEl.style.top = `${DANGER_LINE_Y}px`;

  setupResize();
}

/** Updates the "next slime" preview swatch in the HUD's top-left corner. */
export function setNextPreview(radius, color) {
  nextPreviewEl.style.backgroundColor = color;
  const size = Math.min(48, Math.max(16, radius * 0.6));
  nextPreviewEl.style.width = `${size}px`;
  nextPreviewEl.style.height = `${size}px`;
}

export function showGameOver(finalScore, bestScore) {
  finalScoreValueEl.textContent = String(finalScore);
  bestScoreValueEl.textContent = String(bestScore);
  gameOverEl.classList.remove('hidden');
}

export function hideGameOver() {
  gameOverEl.classList.add('hidden');
}

/**
 * Keeps the fixed-size logical stage (380x600, matching the canvas's own
 * drawing-buffer resolution) fitted to the viewport via a CSS transform.
 * Physics and rendering both stay in logical coordinates; only this visual
 * scale factor changes, so nothing downstream needs to know about it.
 */
function setupResize() {
  function resize() {
    const scale = Math.min(
      (window.innerWidth * VIEWPORT_MARGIN) / CANVAS_WIDTH,
      (window.innerHeight * VIEWPORT_MARGIN) / CANVAS_HEIGHT
    );
    stage.style.transform = `scale(${scale})`;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  resize();
}
