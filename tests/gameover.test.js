import { describe, it, expect } from 'vitest';
import { checkGameOver } from '../src/gameover.js';
import { DANGER_LINE_Y } from '../src/physics.js';

function fakeSlime(y) {
  return { body: { position: { y } } };
}

describe('checkGameOver', () => {
  it('does not trigger before 1000ms above the line', () => {
    const slimes = [fakeSlime(DANGER_LINE_Y - 10)];
    expect(checkGameOver(slimes, 0)).toBe(false);
    expect(checkGameOver(slimes, 500)).toBe(false);
    expect(checkGameOver(slimes, 999)).toBe(false);
  });

  it('triggers once a slime has been above the line for >= 1000ms continuously', () => {
    const slimes = [fakeSlime(DANGER_LINE_Y - 10)];
    expect(checkGameOver(slimes, 0)).toBe(false);
    expect(checkGameOver(slimes, 1000)).toBe(true);
  });

  it('resets the timer the moment a slime dips back below the line', () => {
    const slime = fakeSlime(DANGER_LINE_Y - 10);
    const slimes = [slime];

    expect(checkGameOver(slimes, 0)).toBe(false);
    expect(checkGameOver(slimes, 600)).toBe(false);

    slime.body.position.y = DANGER_LINE_Y + 10; // dips below
    expect(checkGameOver(slimes, 800)).toBe(false);

    slime.body.position.y = DANGER_LINE_Y - 10; // back above: timer restarts
    expect(checkGameOver(slimes, 850)).toBe(false);
    expect(checkGameOver(slimes, 1849)).toBe(false); // 999ms since re-entry
    expect(checkGameOver(slimes, 1850)).toBe(true); // 1000ms since re-entry
  });

  it('a slime exactly on/below the line never counts as above', () => {
    const slimes = [fakeSlime(DANGER_LINE_Y), fakeSlime(DANGER_LINE_Y + 50)];
    expect(checkGameOver(slimes, 0)).toBe(false);
    expect(checkGameOver(slimes, 5000)).toBe(false);
  });
});
