import { describe, it, expect, beforeEach } from 'vitest';
import { getScore, addScore, resetScore, onScoreChange, isGameOverActive, setGameOver } from '../src/state.js';

beforeEach(() => {
  resetScore();
  setGameOver(false);
});

describe('score', () => {
  it('starts at 0 and accumulates via addScore', () => {
    expect(getScore()).toBe(0);
    addScore(10);
    addScore(5);
    expect(getScore()).toBe(15);
  });

  it('resetScore brings it back to 0', () => {
    addScore(100);
    resetScore();
    expect(getScore()).toBe(0);
  });

  it('notifies onScoreChange listeners with the running total on every change', () => {
    const seen = [];
    onScoreChange((score) => seen.push(score));

    addScore(4);
    addScore(6);
    resetScore();

    expect(seen).toEqual([4, 10, 0]);
  });
});

describe('game over flag', () => {
  it('defaults to false and reflects setGameOver', () => {
    expect(isGameOverActive()).toBe(false);
    setGameOver(true);
    expect(isGameOverActive()).toBe(true);
    setGameOver(false);
    expect(isGameOverActive()).toBe(false);
  });
});
