// DOM overlay: score readout, next-slime preview, danger line, and the
// menu/pause/settings/game-over screens. Pure DOM/CSS here — no physics or
// game rules; main.js owns what each button actually does to the game.

import { onScoreChange, getScore } from './state.js';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  JAR_LEFT,
  JAR_WIDTH,
  DANGER_LINE_Y,
  WALL_VISUAL_WIDTH,
} from './physics.js';
import { isMuted, toggleMuted, primeAudio } from './sound.js';
import { SLIME_LEVELS } from './entities.js';

const stage = document.getElementById('stage');
const scoreValueEl = document.getElementById('score-value');
const nextPreviewEl = document.getElementById('next-preview-circle');
const dangerLineEl = document.getElementById('danger-line');
const pauseButton = document.getElementById('pause-button');

const mainMenuEl = document.getElementById('main-menu');
const startButton = document.getElementById('start-button');
const menuSettingsButton = document.getElementById('menu-settings-button');

const pauseOverlayEl = document.getElementById('pause-overlay');
const resumeButton = document.getElementById('resume-button');
const pauseRestartButton = document.getElementById('pause-restart-button');
const pauseSettingsButton = document.getElementById('pause-settings-button');

const settingsOverlayEl = document.getElementById('settings-overlay');
const soundToggleButton = document.getElementById('sound-toggle-button');
const settingsBackButton = document.getElementById('settings-back-button');

const gameOverEl = document.getElementById('game-over');
const finalScoreValueEl = document.getElementById('final-score-value');
const bestScoreValueEl = document.getElementById('best-score-value');
const restartButton = document.getElementById('restart-button');

// Leaves a small margin around the scaled stage so it never touches the
// screen edges exactly.
const VIEWPORT_MARGIN = 0.96;

/**
 * `onStart`/`onPauseRequest`/`onResumeRequest`/`onRestart` are the game-flow
 * callbacks main.js supplies. Settings is purely a UI concern (it just
 * stacks on top of whichever screen opened it — menu or pause — without
 * hiding it) so it needs no callback into main.js at all.
 */
export function initUI({ onStart, onPauseRequest, onResumeRequest, onRestart }) {
  onScoreChange((score) => {
    scoreValueEl.textContent = String(score);
  });
  scoreValueEl.textContent = String(getScore());

  startButton.addEventListener('click', () => {
    primeAudio(); // the menu's Play button is the session's first real gesture
    hideMenu();
    onStart();
  });
  pauseButton.addEventListener('click', onPauseRequest);
  resumeButton.addEventListener('click', () => {
    hidePause();
    onResumeRequest();
  });
  pauseRestartButton.addEventListener('click', onRestart);
  restartButton.addEventListener('click', onRestart);

  menuSettingsButton.addEventListener('click', showSettings);
  pauseSettingsButton.addEventListener('click', showSettings);
  settingsBackButton.addEventListener('click', hideSettings);

  updateSoundToggleLabel();
  soundToggleButton.addEventListener('click', () => {
    primeAudio();
    toggleMuted();
    updateSoundToggleLabel();
  });

  // The danger line's position is fixed in logical coordinates, same as the
  // jar itself, so it only needs to be placed once — the whole stage
  // (canvas + overlay) scales together as one unit on resize. Inset by half
  // the wall's visual thickness so the line stays strictly inside the
  // beige interior instead of poking past the wall on either side.
  const wallInset = WALL_VISUAL_WIDTH / 2;
  dangerLineEl.style.left = `${JAR_LEFT + wallInset}px`;
  dangerLineEl.style.width = `${JAR_WIDTH - wallInset * 2}px`;
  dangerLineEl.style.top = `${DANGER_LINE_Y}px`;

  setupResize();
}

function updateSoundToggleLabel() {
  soundToggleButton.textContent = isMuted() ? 'Звук: выкл' : 'Звук: вкл';
}

// Cycles through every level's actual color (and back to the first) so the
// HUD swatch matches the wildcard slime's own all-colors body exactly.
const WILDCARD_PREVIEW_GRADIENT = `conic-gradient(${SLIME_LEVELS.map((def) => def.color)
  .concat(SLIME_LEVELS[0].color)
  .join(', ')})`;

/**
 * Updates the "next slime" preview swatch in the HUD's top-left corner.
 * The wildcard bonus slime (isWild) gets a rainbow ring instead of a flat
 * color so its "matches anything" nature is visible before it's dropped.
 */
export function setNextPreview(radius, color, isWild = false) {
  nextPreviewEl.style.backgroundImage = isWild ? WILDCARD_PREVIEW_GRADIENT : 'none';
  nextPreviewEl.style.backgroundColor = isWild ? 'transparent' : color;
  const size = Math.min(48, Math.max(16, radius * 0.6));
  nextPreviewEl.style.width = `${size}px`;
  nextPreviewEl.style.height = `${size}px`;
}

export function hideMenu() {
  mainMenuEl.classList.add('hidden');
}

export function showPause() {
  pauseOverlayEl.classList.remove('hidden');
}

export function hidePause() {
  pauseOverlayEl.classList.add('hidden');
}

function showSettings() {
  settingsOverlayEl.classList.remove('hidden');
}

function hideSettings() {
  settingsOverlayEl.classList.add('hidden');
}

export function setPauseButtonVisible(visible) {
  pauseButton.classList.toggle('hidden', !visible);
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
