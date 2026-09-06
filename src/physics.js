// Matter.js world setup: engine, gravity, and the static jar (container) walls.

import Matter from 'matter-js';
import decomp from 'poly-decomp';

// The bottom-corner filler bodies below are built from raw vertices; Matter
// needs poly-decomp wired in to decompose/validate them, otherwise it just
// logs a "concave vertices" warning on every world creation.
Matter.Common.setDecomp(decomp);

const { Engine, World, Bodies, Vertices } = Matter;

export const CANVAS_WIDTH = 380;
export const CANVAS_HEIGHT = 600;

// The jar is the playable container the slimes fall into.
export const JAR_WIDTH = 340;
export const JAR_HEIGHT = 500;
export const WALL_THICKNESS = 20;

// Width of the drawn wall stroke (render.js's dark outer pass), centered on
// the jar boundary path — half of it sits inside the interior, half outside.
// Shared so HUD elements (the danger line) can inset themselves to stay
// strictly within the beige interior instead of poking past the wall.
export const WALL_VISUAL_WIDTH = 12;

// Jar is horizontally centered and sits near the bottom of the canvas,
// leaving an open area above it for the spawner to hang the pending slime.
export const JAR_LEFT = (CANVAS_WIDTH - JAR_WIDTH) / 2;
export const JAR_RIGHT = JAR_LEFT + JAR_WIDTH;
export const JAR_BOTTOM = CANVAS_HEIGHT - 20;
export const JAR_TOP = JAR_BOTTOM - JAR_HEIGHT;

// Danger line sits at 85% of the jar's height measured from the bottom
// (i.e. 15% down from the open top) — stacking a slime above it for too
// long ends the game.
export const DANGER_LINE_RATIO = 0.85;
export const DANGER_LINE_Y = JAR_BOTTOM - JAR_HEIGHT * DANGER_LINE_RATIO;

// Rounding radius for the jar's two bottom corners (Fruit-Merge/Suika style
// — no sharp corners at the bottom, top stays open). Shared with render.js
// so the drawn outline and the invisible collision boundary always match:
// see createCornerFiller() below for how the physics side uses it.
export const JAR_CORNER_RADIUS = 28;

const CORNER_SEGMENTS = 10;

/**
 * A rounded bottom corner needs the jar's interior to lose the small sliver
 * between the sharp rectangular corner and the rounding arc — otherwise a
 * slime could sit in that sharp corner while the art draws it as "outside"
 * the rounded wall. leftWall/rightWall/floor below stay full sharp
 * rectangles (simplest, no risk of opening a gap); this adds one small
 * convex "wedge" body per bottom corner that plugs exactly that sliver, so
 * the ball's actual reachable interior ends up rounded to match the art.
 *
 * `sharpCorner` is the rectangular interior corner being rounded off;
 * the arc from `startAngle` to `endAngle` (radians, Matter/canvas
 * convention) around `arcCenter` is tangent to the wall on one end and the
 * floor on the other.
 */
function createCornerFiller(sharpCorner, arcCenter, startAngle, endAngle) {
  const vertices = [{ x: sharpCorner.x, y: sharpCorner.y }];
  for (let i = 0; i <= CORNER_SEGMENTS; i += 1) {
    const angle = startAngle + ((endAngle - startAngle) * i) / CORNER_SEGMENTS;
    vertices.push({
      x: arcCenter.x + JAR_CORNER_RADIUS * Math.cos(angle),
      y: arcCenter.y + JAR_CORNER_RADIUS * Math.sin(angle),
    });
  }

  // fromVertices positions the body at (x, y) and re-centers the vertices
  // around it — passing the vertices' own centroid keeps them exactly where
  // they were authored above, in absolute world coordinates.
  const centre = Vertices.centre(vertices);
  return Bodies.fromVertices(centre.x, centre.y, [vertices], {
    isStatic: true,
    friction: 0.5,
    restitution: 0.1,
  });
}

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

  // Plug the two bottom corners so the reachable interior is rounded to
  // match the drawn outline (see createCornerFiller's doc comment above).
  const bottomLeftFiller = createCornerFiller(
    { x: JAR_LEFT, y: JAR_BOTTOM },
    { x: JAR_LEFT + JAR_CORNER_RADIUS, y: JAR_BOTTOM - JAR_CORNER_RADIUS },
    Math.PI,
    Math.PI / 2
  );
  bottomLeftFiller.label = 'wall-corner-left';

  const bottomRightFiller = createCornerFiller(
    { x: JAR_RIGHT, y: JAR_BOTTOM },
    { x: JAR_RIGHT - JAR_CORNER_RADIUS, y: JAR_BOTTOM - JAR_CORNER_RADIUS },
    0,
    Math.PI / 2
  );
  bottomRightFiller.label = 'wall-corner-right';

  World.add(engine.world, [leftWall, rightWall, floor, bottomLeftFiller, bottomRightFiller]);

  return { engine, world: engine.world };
}
