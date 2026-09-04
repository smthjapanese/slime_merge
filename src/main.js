// Entry point: wires up physics, input and rendering, and runs the game loop.

import Matter from 'matter-js';
import { createPhysicsWorld, JAR_TOP } from './physics.js';
import { createSlime, randomSpawnLevel } from './entities.js';
import { setupInput } from './input.js';
import { renderScene } from './render.js';
import { setupMergeHandling } from './merge.js';

const { World, Runner } = Matter;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const { engine, world } = createPhysicsWorld();

// Height at which the pending (not-yet-dropped) slime hangs, just above the
// jar's open top so it doesn't immediately collide with anything.
const PENDING_Y = JAR_TOP - 40;

// All slimes that have been dropped into the jar and now have physics bodies.
const slimes = [];

// Detects same-level collisions and merges them into the next level up.
setupMergeHandling(engine, world, slimes);

// The slime "loaded" in the spawner, waiting to be dropped. Has no physics
// body yet — it's purely a render-time concept until the player drops it.
let pending = null;

function spawnPending(x) {
  const level = randomSpawnLevel();
  // Reuse createSlime just to read the level's radius/color without adding
  // a physics body — the body is only created once the slime is dropped.
  const preview = createSlime(level, x, PENDING_Y);
  World.remove(world, preview.body); // never actually simulate the preview
  pending = { level, x, y: PENDING_Y, radius: preview.radius, color: preview.color };
}

function dropSlime(x) {
  if (!pending) return;
  const slime = createSlime(pending.level, x, PENDING_Y);
  World.add(world, slime.body);
  slimes.push(slime);
  spawnPending(x);
}

setupInput(canvas, {
  getRadius: () => (pending ? pending.radius : 0),
  onMove: (x) => {
    if (pending) pending.x = x;
  },
  onDrop: (x) => dropSlime(x),
});

if (!pending) {
  spawnPending(canvas.width / 2);
}

// Matter.js runner steps the physics simulation on its own fixed-ish timestep.
const runner = Runner.create();
Runner.run(runner, engine);

function loop() {
  renderScene(ctx, { slimes, pending });
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
