// Slime facial expressions: which one a slime is showing right now, and how
// to draw it. Deliberately separate from animation.js (which only handles
// squash/idle/pop *scale*) and from the rest of the artwork in render.js
// (body/horns/highlight/cheeks never change with expression).

export const EXPRESSIONS = ['happy', 'neutral', 'surprised', 'dizzy', 'sleepy'];

// A slime's resting default is always a smile — 'neutral' stays a valid,
// drawable expression (see drawFace below) but is never picked as the base
// one anymore. Surprised and dizzy only ever happen as a reaction (see
// triggerSurprised/triggerDizzy below).
export function pickRandomBaseExpression() {
  return 'happy';
}

const SURPRISED_DURATION_MS = 220;
const DIZZY_DURATION_MS = 260;

/** Call on impact (landing, bumping another slime) — reacts with wide eyes briefly. */
export function triggerSurprised(slime, now) {
  slime.surprisedUntil = now + SURPRISED_DURATION_MS;
}

/** Call once, right when a merged slime is created — dazed for a beat. */
export function triggerDizzy(slime, now) {
  slime.dizzyUntil = now + DIZZY_DURATION_MS;
}

/**
 * Resolves which expression `slime` should show right now: a freshly-merged
 * slime is dizzy, an impact reaction (surprised) comes next, then a resting
 * slime (low physics speed) falls asleep, and otherwise it shows the base
 * expression it was born with.
 */
export function getExpression(slime, now, isResting) {
  if (slime.dizzyUntil != null && now < slime.dizzyUntil) return 'dizzy';
  if (slime.surprisedUntil != null && now < slime.surprisedUntil) return 'surprised';
  if (isResting) return 'sleepy';
  return slime.baseExpression;
}

const EYE_OFFSET_X = 0.32;
const EYE_OFFSET_Y = -0.05;
const FACE_COLOR = '#1a1a2e';

function eyeCenters(radius) {
  return [
    [-radius * EYE_OFFSET_X, radius * EYE_OFFSET_Y],
    [radius * EYE_OFFSET_X, radius * EYE_OFFSET_Y],
  ];
}

/** Draws just the eyes + mouth for `expression`, scaled to `radius`, at the origin. */
export function drawFace(ctx, radius, expression) {
  switch (expression) {
    case 'neutral':
      drawDotEyes(ctx, radius, false);
      drawFlatMouth(ctx, radius);
      break;
    case 'surprised':
      drawWideEyes(ctx, radius);
      drawRoundMouth(ctx, radius);
      break;
    case 'dizzy':
      drawCrossEyes(ctx, radius);
      drawWavyMouth(ctx, radius);
      break;
    case 'sleepy':
      drawClosedEyes(ctx, radius);
      drawFlatMouth(ctx, radius);
      break;
    case 'happy':
    default:
      drawDotEyes(ctx, radius, true);
      drawSmileMouth(ctx, radius);
      break;
  }
}

function drawDotEyes(ctx, radius, withHighlight) {
  const eyeRadius = radius * 0.11;
  for (const [x, y] of eyeCenters(radius)) {
    ctx.beginPath();
    ctx.arc(x, y, eyeRadius, 0, Math.PI * 2);
    ctx.fillStyle = FACE_COLOR;
    ctx.fill();

    if (withHighlight) {
      ctx.beginPath();
      ctx.arc(x - eyeRadius * 0.35, y - eyeRadius * 0.35, eyeRadius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }
}

function drawWideEyes(ctx, radius) {
  const outerRadius = radius * 0.16;
  const pupilRadius = radius * 0.08;
  for (const [x, y] of eyeCenters(radius)) {
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = Math.max(1, radius * 0.02);
    ctx.strokeStyle = FACE_COLOR;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, pupilRadius, 0, Math.PI * 2);
    ctx.fillStyle = FACE_COLOR;
    ctx.fill();
  }
}

function drawCrossEyes(ctx, radius) {
  const arm = radius * 0.13;
  ctx.lineWidth = Math.max(1, radius * 0.045);
  ctx.strokeStyle = FACE_COLOR;
  ctx.lineCap = 'round';
  for (const [x, y] of eyeCenters(radius)) {
    ctx.beginPath();
    ctx.moveTo(x - arm, y - arm);
    ctx.lineTo(x + arm, y + arm);
    ctx.moveTo(x - arm, y + arm);
    ctx.lineTo(x + arm, y - arm);
    ctx.stroke();
  }
}

function drawClosedEyes(ctx, radius) {
  const halfWidth = radius * 0.13;
  ctx.lineWidth = Math.max(1, radius * 0.045);
  ctx.strokeStyle = FACE_COLOR;
  ctx.lineCap = 'round';
  for (const [x, y] of eyeCenters(radius)) {
    ctx.beginPath();
    ctx.moveTo(x - halfWidth, y);
    ctx.quadraticCurveTo(x, y + halfWidth * 0.7, x + halfWidth, y);
    ctx.stroke();
  }
}

function drawSmileMouth(ctx, radius) {
  ctx.beginPath();
  ctx.arc(0, radius * 0.05, radius * 0.32, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.lineWidth = Math.max(1, radius * 0.06);
  ctx.strokeStyle = FACE_COLOR;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawFlatMouth(ctx, radius) {
  ctx.beginPath();
  ctx.moveTo(-radius * 0.14, radius * 0.24);
  ctx.lineTo(radius * 0.14, radius * 0.24);
  ctx.lineWidth = Math.max(1, radius * 0.05);
  ctx.strokeStyle = FACE_COLOR;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawRoundMouth(ctx, radius) {
  ctx.beginPath();
  ctx.arc(0, radius * 0.26, radius * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = FACE_COLOR;
  ctx.fill();
}

function drawWavyMouth(ctx, radius) {
  const y = radius * 0.24;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.18, y);
  ctx.quadraticCurveTo(-radius * 0.09, y - radius * 0.08, 0, y);
  ctx.quadraticCurveTo(radius * 0.09, y + radius * 0.08, radius * 0.18, y);
  ctx.lineWidth = Math.max(1, radius * 0.05);
  ctx.strokeStyle = FACE_COLOR;
  ctx.lineCap = 'round';
  ctx.stroke();
}
