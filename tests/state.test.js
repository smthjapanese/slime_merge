import { describe, it, expect, beforeEach } from 'vitest';
import {
  getScore,
  addScore,
  resetScore,
  onScoreChange,
  isGameOverActive,
  setGameOver,
  registerMergeForCombo,
  getCombo,
  resetCombo,
} from '../src/state.js';

beforeEach(() => {
  resetScore();
  setGameOver(false);
  resetCombo();
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

describe('combo streak', () => {
  it('starts a fresh merge at streak 1', () => {
    expect(getCombo()).toBe(0);
    expect(registerMergeForCombo(1000)).toBe(1);
    expect(getCombo()).toBe(1);
  });

  it('increments the streak for merges within the 800ms window', () => {
    registerMergeForCombo(1000);
    expect(registerMergeForCombo(1500)).toBe(2);
    expect(registerMergeForCombo(1800)).toBe(3); // 300ms after the last, still inside the window
  });

  it('resets to 1 once the gap since the last merge exceeds the window', () => {
    registerMergeForCombo(1000);
    registerMergeForCombo(1500); // streak 2
    expect(registerMergeForCombo(1500 + 801)).toBe(1);
  });

  it('a merge exactly at the window boundary still counts as part of the streak', () => {
    registerMergeForCombo(1000);
    expect(registerMergeForCombo(1000 + 800)).toBe(2);
  });

  it('resetCombo clears the streak so the next merge starts fresh', () => {
    registerMergeForCombo(1000);
    registerMergeForCombo(1200);
    resetCombo();
    expect(getCombo()).toBe(0);
    expect(registerMergeForCombo(1250)).toBe(1); // would've been streak 3 without the reset
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
