// Matter.js world setup: engine, gravity, and the static jar (container) walls.

import Matter from 'matter-js';

const { Engine, World, Bodies } = Matter;

export const CANVAS_WIDTH = 380;
export const CANVAS_HEIGHT = 600;

// The jar is the playable container the slimes fall into.
export const JAR_WIDTH = 340;
export const JAR_HEIGHT = 500;
export const WALL_THICKNESS = 20;

// Jar is horizontally centered and sits near the bottom of the canvas,
// leaving an open area above it for the spawner to hang the pending slime.
export const JAR_LEFT = (CANVAS_WIDTH - JAR_WIDTH) / 2;
export const JAR_RIGHT = JAR_LEFT + JAR_WIDTH;
export const JAR_BOTTOM = CANVAS_HEIGHT - 20;
export const JAR_TOP = JAR_BOTTOM - JAR_HEIGHT;

/**
 * Builds a fresh Matter.js engine with static walls for the left, right and
 * bottom of the jar. The top stays open — that's where slimes are dropped in.
 */
export function createPhysicsWorld() {
  const engine = Engine.create();
  engine.gravity.y = 1;

  const wallOptions = {
    isStatic: true,
    friction: 0.5,
    restitution: 0.1,
  };

  const leftWall = Bodies.rectangle(
    JAR_LEFT - WALL_THICKNESS / 2,
    JAR_TOP + JAR_HEIGHT / 2,
    WALL_THICKNESS,
    JAR_HEIGHT,
    { ...wallOptions, label: 'wall-left' }
  );

  const rightWall = Bodies.rectangle(
    JAR_RIGHT + WALL_THICKNESS / 2,
    JAR_TOP + JAR_HEIGHT / 2,
    WALL_THICKNESS,
    JAR_HEIGHT,
    { ...wallOptions, label: 'wall-right' }
  );

  const floor = Bodies.rectangle(
    JAR_LEFT + JAR_WIDTH / 2,
    JAR_BOTTOM + WALL_THICKNESS / 2,
    JAR_WIDTH + WALL_THICKNESS * 2,
    WALL_THICKNESS,
    { ...wallOptions, label: 'wall-floor' }
  );

  World.add(engine.world, [leftWall, rightWall, floor]);

  return { engine, world: engine.world };
}
