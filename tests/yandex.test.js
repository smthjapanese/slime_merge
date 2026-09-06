import { describe, it, expect, beforeEach, vi } from 'vitest';

// Each test gets a fresh module instance (isAdDueThisRestart/ysdk/player are
// module-level mutable state) and a clean localStorage, so tests can't leak
// into each other.
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('isAdDueThisRestart', () => {
  it('returns true only on every 3rd call', async () => {
    const { isAdDueThisRestart } = await import('../src/yandex.js');
    const results = [];
    for (let i = 0; i < 9; i += 1) results.push(isAdDueThisRestart());
    expect(results).toEqual([false, false, true, false, false, true, false, false, true]);
  });
});

describe('best score persistence without the platform SDK', () => {
  it('falls back to localStorage when window.YaGames is unavailable', async () => {
    const { initYandexSDK, getBestScore, setBestScore } = await import('../src/yandex.js');
    await initYandexSDK(); // no window.YaGames in the test environment -> resolves null

    expect(await getBestScore()).toBe(0);
    await setBestScore(1234);
    expect(await getBestScore()).toBe(1234);
    expect(localStorage.getItem('slime-merge-best-score')).toBe('1234');
  });
});

describe('showFullscreenAd without the SDK', () => {
  it('calls onDone synchronously when ysdk/adv is unavailable', async () => {
    const { showFullscreenAd } = await import('../src/yandex.js');
    const onDone = vi.fn();
    showFullscreenAd(onDone);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('notifyGameReady/notifyGameplayStart/Stop without the SDK', () => {
  it('are safe no-ops', async () => {
    const { notifyGameReady, notifyGameplayStart, notifyGameplayStop } = await import(
      '../src/yandex.js'
    );
    expect(() => notifyGameReady()).not.toThrow();
    expect(() => notifyGameplayStart()).not.toThrow();
    expect(() => notifyGameplayStop()).not.toThrow();
  });
});
