import { describe, it, expect, beforeEach } from 'vitest';
import { playLandThud, playMerge, playGameOver, isMuted, setMuted, toggleMuted } from '../src/sound.js';

// jsdom has no Web Audio implementation at all — this environment is exactly
// the "AudioContext unavailable" case sound.js needs to degrade gracefully
// for (older webviews can hit the same thing), so these tests double as a
// regression check for that fallback path.
describe('sound effects without Web Audio support', () => {
  it('never throw, muted or not', () => {
    setMuted(false);
    expect(() => playLandThud(performance.now())).not.toThrow();
    expect(() => playMerge(3)).not.toThrow();
    expect(() => playGameOver()).not.toThrow();

    setMuted(true);
    expect(() => playLandThud(performance.now())).not.toThrow();
    expect(() => playMerge(3)).not.toThrow();
    expect(() => playGameOver()).not.toThrow();
  });
});

describe('mute state', () => {
  beforeEach(() => {
    setMuted(false);
  });

  it('toggleMuted flips and returns the new state', () => {
    expect(isMuted()).toBe(false);
    expect(toggleMuted()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(toggleMuted()).toBe(false);
    expect(isMuted()).toBe(false);
  });

  it('persists across a reload via localStorage', () => {
    setMuted(true);
    expect(localStorage.getItem('slime-merge-muted')).toBe('1');
    setMuted(false);
    expect(localStorage.getItem('slime-merge-muted')).toBe('0');
  });
});
