// Canvas drawing: jar outline, dropped slimes (synced from Matter.js bodies)
// and the pending slime hanging above the jar.

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  JAR_LEFT,
  JAR_RIGHT,
  JAR_TOP,
  JAR_BOTTOM,
} from './physics.js';

export function clearScene(ctx) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function drawJar(ctx) {
  ctx.save();
  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(JAR_LEFT, JAR_TOP);
  ctx.lineTo(JAR_LEFT, JAR_BOTTOM);
  ctx.lineTo(JAR_RIGHT, JAR_BOTTOM);
  ctx.lineTo(JAR_RIGHT, JAR_TOP);
  ctx.stroke();
  ctx.restore();
}

/** Draws a single slime as a flat-filled circle at its physics body's position/angle. */
export function drawSlime(ctx, slime) {
  const { position, angle } = slime.body;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(angle);
  ctx.fillStyle = slime.color;
  ctx.beginPath();
  ctx.arc(0, 0, slime.radius, 0, Math.PI * 2);
  ctx.fill();
  // Small marker so rotation is visible even with a flat fill (useful while
  // there's no real slime artwork yet).
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(slime.radius, 0);
  ctx.stroke();
  ctx.restore();
}

/** Draws the pending (not-yet-dropped) slime at a fixed height, following the spawner's x. */
export function drawPendingSlime(ctx, x, y, radius, color) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderScene(ctx, { slimes, pending }) {
  clearScene(ctx);
  drawJar(ctx);

  for (const slime of slimes) {
    drawSlime(ctx, slime);
  }

  if (pending) {
    drawPendingSlime(ctx, pending.x, pending.y, pending.radius, pending.color);
  }
}
