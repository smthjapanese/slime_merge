// Entry point: wires up physics, input, UI and rendering, and runs the game loop.

import Matter from 'matter-js';
import { createPhysicsWorld, JAR_TOP } from './physics.js';
import { createSlime, previewSlime, randomSpawnLevel } from './entities.js';
import { setupInput } from './input.js';
import { renderScene } from './render.js';
import { setupMergeHandling } from './merge.js';
import { setupLandingSquash } from './animation.js';
import { pruneExpiredEffects } from './effects.js';
import { checkGameOver } from './gameover.js';
import { resetScore, setGameOver, isGameOverActive, getScore } from './state.js';
import { initUI, setNextPreview, showGameOver, hideGameOver } from './ui.js';
import { playGameOver, primeAudio } from './sound.js';
import {
  initYandexSDK,
  notifyGameReady,
  notifyGameplayStart,
  notifyGameplayStop,
  getBestScore,
  setBestScore,
  isAdDueThisRestart,
  showFullscreenAd,
} from './yandex.js';

const { World, Runner } = Matter;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// How far above the jar's open top the pending slime hangs.
const PENDING_Y_OFFSET = 40;

let engine;
let world;
let runner;

// All slimes that have been dropped into the jar and now have physics bodies.
// Kept as a single mutable array (rather than reassigned) so closures in
// merge.js and the render loop always see the current contents, restarts
// included.
const slimes = [];

// Transient visual-only effects (currently just merge flashes), same
// mutate-in-place pattern as `slimes`.
const effects = [];

// The slime "loaded" in the spawner, hanging above the jar and waiting to
// be dropped. Has no physics body yet — it's purely a render-time concept
// until the player drops it.
let pending = null;

// The level after `pending` — only its level index is needed ahead of time;
// it becomes the next `pending` once the current one is dropped. Shown as
// a small swatch in the HUD so the player can plan one slime further ahead.
let upcomingLevel = null;

// Kicked off immediately; game start doesn't wait on it. Best-score reads
// and the mandatory LoadingAPI.ready() signal chain off it so they never
// race the SDK's own async init.
const yandexReady = initYandexSDK();

let bestScore = 0;
yandexReady.then(() => getBestScore()).then((score) => {
  bestScore = score;
});

function pendingY() {
  return JAR_TOP - PENDING_Y_OFFSET;
}

/** Rolls a new upcoming level and reflects it in the HUD's "next" swatch. */
function rollUpcoming() {
  upcomingLevel = randomSpawnLevel(getScore());
  const preview = previewSlime(upcomingLevel);
  setNextPreview(preview.radius, preview.color);
}

/** Promotes the current `upcomingLevel` into the hanging `pending` slime, then rolls a new upcoming one. */
function spawnPending(x) {
  const preview = previewSlime(upcomingLevel);
  pending = {
    level: upcomingLevel,
    x,
    y: pendingY(),
    radius: preview.radius,
    color: preview.color,
    expression: preview.expression,
  };
  rollUpcoming();
}

/** First-time / post-restart setup: seeds the upcoming slot before promoting it. */
function initSpawner(x) {
  rollUpcoming();
  spawnPending(x);
}

function dropSlime(x) {
  if (!pending || isGameOverActive()) return;
  primeAudio(); // must happen synchronously inside this user-gesture call chain
  const slime = createSlime(pending.level, x, pendingY());
  World.add(world, slime.body);
  slimes.push(slime);
  spawnPending(x);
}

/** (Re)creates the physics engine/world/runner from scratch. */
function startWorld() {
  const created = createPhysicsWorld();
  engine = created.engine;
  world = created.world;
  setupMergeHandling(engine, world, slimes, effects);
  setupLandingSquash(engine);

  runner = Runner.create();
  Runner.run(runner, engine);
  notifyGameplayStart();
}

/** Full reset: clears the world, the jar is rebuilt, score and slimes start over. */
function resetGame() {
  Runner.stop(runner);
  slimes.length = 0;
  effects.length = 0;
  resetScore();
  setGameOver(false);
  startWorld();
  initSpawner(canvas.width / 2);
  hideGameOver();
}

/** Restart button handler: gates the actual reset behind an occasional ad. */
function handleRestartRequest() {
  if (isAdDueThisRestart()) {
    showFullscreenAd(resetGame);
  } else {
    resetGame();
  }
}

setupInput(canvas, {
  getRadius: () => (pending ? pending.radius : 0),
  onMove: (x) => {
    if (pending) pending.x = x;
  },
  onDrop: (x) => dropSlime(x),
});

initUI({ onRestart: handleRestartRequest });

// Pause physics while the tab/app is backgrounded — otherwise a slime can
// fall through several seconds of un-rendered simulation in one jump when
// the player comes back (or the browser throttles the timestep unevenly).
let pausedForVisibility = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (!isGameOverActive()) {
      Runner.stop(runner);
      notifyGameplayStop();
      pausedForVisibility = true;
    }
  } else if (pausedForVisibility) {
    pausedForVisibility = false;
    Runner.run(runner, engine);
    notifyGameplayStart();
  }
});

startWorld();
initSpawner(canvas.width / 2);

let firstFrameRendered = false;

function loop(now) {
  if (!isGameOverActive() && checkGameOver(slimes, now)) {
    setGameOver(true);
    Runner.stop(runner);
    notifyGameplayStop();
    playGameOver();
    const finalScore = getScore();
    if (finalScore > bestScore) {
      bestScore = finalScore;
      setBestScore(bestScore);
    }
    showGameOver(finalScore, bestScore);
  }

  pruneExpiredEffects(effects, now);
  renderScene(ctx, { slimes, pending, effects }, now);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    // Yandex Games moderation requirement: signal "loaded" only once the
    // first frame has actually been drawn.
    yandexReady.then(() => notifyGameReady());
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
