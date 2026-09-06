// Canvas drawing: jar outline, slime artwork (SVG-style path + radial
// gradient, drawn directly — no raster sprites) and transient effects.

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  JAR_LEFT,
  JAR_RIGHT,
  JAR_TOP,
  JAR_BOTTOM,
} from './physics.js';
import { getSlimeRenderScale, isResting } from './animation.js';
import { effectProgress } from './effects.js';
import { lighten, darken } from './color.js';
import { getExpression, drawFace } from './face.js';

export function clearScene(ctx) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function drawJar(ctx) {
  ctx.save();
  ctx.strokeStyle = '#7fa3d1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(JAR_LEFT, JAR_TOP);
  ctx.lineTo(JAR_LEFT, JAR_BOTTOM);
  ctx.lineTo(JAR_RIGHT, JAR_BOTTOM);
  ctx.lineTo(JAR_RIGHT, JAR_TOP);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws the jelly-slime character centered on the current canvas origin,
 * at the given radius. All feature sizes are proportional to `radius` so
 * the same artwork scales cleanly across all 8 levels.
 */
function drawSlimeArt(ctx, radius, color, expression) {
  const light = lighten(color, 0.55);
  const dark = darken(color, 0.35);
  const hornColor = darken(color, 0.15);

  // --- Body: glossy jelly fill, lighter toward the upper-left, darker at
  // the edges.
  const gradient = ctx.createRadialGradient(
    -radius * 0.35,
    -radius * 0.4,
    radius * 0.05,
    0,
    0,
    radius * 1.05
  );
  gradient.addColorStop(0, light);
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, dark);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = Math.max(1, radius * 0.03);
  ctx.strokeStyle = dark;
  ctx.stroke();

  // --- Horns: two small nubs on top.
  drawHorn(ctx, -radius * 0.42, hornColor, radius);
  drawHorn(ctx, radius * 0.42, hornColor, radius);

  // --- Gloss highlight.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    -radius * 0.32,
    -radius * 0.4,
    radius * 0.42,
    radius * 0.24,
    -0.5,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();
  ctx.restore();

  // --- Cheeks (soft pink blush).
  ctx.fillStyle = 'rgba(255, 110, 150, 0.45)';
  drawEllipse(ctx, -radius * 0.5, radius * 0.18, radius * 0.14, radius * 0.09);
  drawEllipse(ctx, radius * 0.5, radius * 0.18, radius * 0.14, radius * 0.09);

  // --- Face: eyes + mouth, shape depends on the current expression.
  drawFace(ctx, radius, expression);
}

function drawHorn(ctx, offsetX, color, radius) {
  const tipY = -radius * 0.98;
  const baseY = -radius * 0.68;
  const baseHalfWidth = radius * 0.1;
  ctx.beginPath();
  ctx.moveTo(offsetX - baseHalfWidth, baseY);
  ctx.quadraticCurveTo(offsetX, (tipY + baseY) / 2, offsetX, tipY);
  ctx.quadraticCurveTo(offsetX, (tipY + baseY) / 2, offsetX + baseHalfWidth, baseY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawEllipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Draws a single dropped slime, synced to its physics body's position/angle. */
export function drawSlime(ctx, slime, now) {
  const { position, angle } = slime.body;
  const { scaleX, scaleY } = getSlimeRenderScale(slime, now);
  const expression = getExpression(slime, now, isResting(slime));

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(angle);
  ctx.scale(scaleX, scaleY);
  drawSlimeArt(ctx, slime.radius, slime.color, expression);
  ctx.restore();
}

/** Draws the pending (not-yet-dropped) slime, translucent, at a fixed height. */
export function drawPendingSlime(ctx, x, y, radius, color, expression) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.translate(x, y);
  drawSlimeArt(ctx, radius, color, expression);
  ctx.restore();
}

/** Draws an expanding, fading flash burst — played at a merge point. */
function drawEffect(ctx, effect, now) {
  const t = effectProgress(effect, now);
  const eased = 1 - (1 - t) ** 2;
  const radius = effect.radius * (0.6 + eased * 0.9);
  const alpha = 0.8 * (1 - t);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

export function renderScene(ctx, { slimes, pending, effects = [] }, now) {
  clearScene(ctx);
  drawJar(ctx);

  for (const slime of slimes) {
    drawSlime(ctx, slime, now);
  }

  for (const effect of effects) {
    drawEffect(ctx, effect, now);
  }

  if (pending) {
    drawPendingSlime(ctx, pending.x, pending.y, pending.radius, pending.color, pending.expression);
  }
}
