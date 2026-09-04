// Pointer/touch handling for the spawner: tracks horizontal drag position
// for the pending slime and fires a callback on tap/click/release to drop it.

import { JAR_LEFT, JAR_RIGHT } from './physics.js';

/**
 * Wires pointer events on `canvas` to a spawner controller.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   getRadius: () => number,   // radius of the currently pending slime, for clamping
 *   onMove: (x: number) => void,  // called as the pending slime follows the pointer
 *   onDrop: (x: number) => void,  // called on tap/click/release to spawn the slime
 * }} handlers
 */
export function setupInput(canvas, { getRadius, onMove, onDrop }) {
  let currentX = (JAR_LEFT + JAR_RIGHT) / 2;

  function clampToJar(x) {
    const radius = getRadius();
    const min = JAR_LEFT + radius;
    const max = JAR_RIGHT - radius;
    return Math.min(Math.max(x, min), max);
  }

  function canvasX(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    return (event.clientX - rect.left) * scaleX;
  }

  function handleMove(event) {
    currentX = clampToJar(canvasX(event));
    onMove(currentX);
  }

  function handleDrop(event) {
    if (event) {
      currentX = clampToJar(canvasX(event));
    }
    onDrop(currentX);
  }

  canvas.addEventListener('pointermove', handleMove);
  canvas.addEventListener('pointerdown', handleMove);
  canvas.addEventListener('pointerup', handleDrop);

  // Initialize the pending slime at the jar's horizontal center.
  onMove(currentX);
}
