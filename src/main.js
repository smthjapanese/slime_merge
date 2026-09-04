// Entry point: wires up physics, input, UI and rendering, and runs the game loop.

import Matter from 'matter-js';
import { createPhysicsWorld, JAR_TOP } from './physics.js';
import { createSlime, randomSpawnLevel } from './entities.js';
import { setupInput } from './input.js';
import { renderScene } from './render.js';
import { setupMergeHandling } from './merge.js';
import { checkGameOver } from './gameover.js';
import { resetScore, setGameOver, isGameOverActive, getScore } from './state.js';
import { initUI, setNextPreview, showGameOver, hideGameOver } from './ui.js';

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

// The slime "loaded" in the spawner, waiting to be dropped. Has no physics
// body yet — it's purely a render-time concept until the player drops it.
let pending = null;

function pendingY() {
  return JAR_TOP - PENDING_Y_OFFSET;
}

function spawnPending(x) {
  const level = randomSpawnLevel();
  // Reuse createSlime just to read the level's radius/color without adding
  // a physics body — the body is only created once the slime is dropped.
  const preview = createSlime(level, x, pendingY());
  World.remove(world, preview.body); // never actually simulate the preview
  pending = { level, x, y: pendingY(), radius: preview.radius, color: preview.color };
  setNextPreview(preview.radius, preview.color);
}

function dropSlime(x) {
  if (!pending || isGameOverActive()) return;
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
  setupMergeHandling(engine, world, slimes);

  runner = Runner.create();
  Runner.run(runner, engine);
}

/** Full reset: clears the world, the jar is rebuilt, score and slimes start over. */
function resetGame() {
  Runner.stop(runner);
  slimes.length = 0;
  resetScore();
  setGameOver(false);
  startWorld();
  spawnPending(canvas.width / 2);
  hideGameOver();
}

setupInput(canvas, {
  getRadius: () => (pending ? pending.radius : 0),
  onMove: (x) => {
    if (pending) pending.x = x;
  },
  onDrop: (x) => dropSlime(x),
});

initUI({ onRestart: resetGame });

startWorld();
spawnPending(canvas.width / 2);

function loop(now) {
  if (!isGameOverActive() && checkGameOver(slimes, now)) {
    setGameOver(true);
    Runner.stop(runner);
    showGameOver(getScore());
  }

  renderScene(ctx, { slimes, pending });
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
