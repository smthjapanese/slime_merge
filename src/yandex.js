// Yandex Games SDK integration: platform init, the mandatory "loading
// finished" signal, best-score persistence (player data with a localStorage
// fallback), and a restart-gated interstitial ad.
//
// Everything here degrades to a harmless no-op outside the Yandex Games
// iframe (e.g. local dev), where `window.YaGames` never gets defined because
// the SDK script tag in index.html fails to load.

const BEST_SCORE_KEY = 'slime-merge-best-score';

// Show a fullscreen ad on every Nth restart, not every single one.
const AD_EVERY_N_RESTARTS = 3;
let restartsSinceLastAd = 0;

let ysdk = null;
let player = null; // non-null only for an authorized (non-"lite") player

/**
 * Initializes the SDK once at startup. Safe to call even when the SDK
 * script never loaded — resolves to null instead of throwing, so the game
 * always starts regardless of platform availability.
 */
export async function initYandexSDK() {
  if (typeof window === 'undefined' || !window.YaGames) {
    return null;
  }
  try {
    ysdk = await window.YaGames.init();
    player = await getAuthorizedPlayer();
    return ysdk;
  } catch (error) {
    console.warn('[yandex] SDK init failed, continuing without it:', error);
    ysdk = null;
    return null;
  }
}

async function getAuthorizedPlayer() {
  if (!ysdk) return null;
  try {
    const candidate = await ysdk.getPlayer();
    // "lite" means an unauthorized/anonymous player — player.setData/getData
    // isn't backed by a real account, so we fall back to localStorage.
    return candidate.getMode() === 'lite' ? null : candidate;
  } catch (error) {
    return null;
  }
}

/**
 * Required by Yandex Games moderation: signals that the game has finished
 * loading and rendered its first frame. Call once, after the first
 * renderScene(). No-ops outside the platform.
 */
export function notifyGameReady() {
  ysdk?.features?.LoadingAPI?.ready();
}

/**
 * Tells the platform active gameplay has (re)started, so it knows not to
 * interrupt the player with an ad right now. Call whenever the physics
 * world becomes playable again (initial load, restart, tab refocus).
 */
export function notifyGameplayStart() {
  ysdk?.features?.GameplayAPI?.start();
}

/**
 * Counterpart to notifyGameplayStart — call whenever gameplay pauses for a
 * reason the platform should know about (game over, showing an ad, the tab
 * going to the background).
 */
export function notifyGameplayStop() {
  ysdk?.features?.GameplayAPI?.stop();
}

/** Reads the saved best score (player data if authorized, else localStorage). */
export async function getBestScore() {
  if (player) {
    try {
      const data = await player.getData(['bestScore']);
      return data.bestScore ?? 0;
    } catch (error) {
      console.warn('[yandex] getData failed, falling back to localStorage:', error);
    }
  }
  return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
}

/** Persists `score` as the best score, same player-data/localStorage split. */
export async function setBestScore(score) {
  if (player) {
    try {
      await player.setData({ bestScore: score }, true);
      return;
    } catch (error) {
      console.warn('[yandex] setData failed, falling back to localStorage:', error);
    }
  }
  localStorage.setItem(BEST_SCORE_KEY, String(score));
}

/**
 * Call once per restart. Returns true on every Nth call, meaning the
 * caller should show a fullscreen ad this time.
 */
export function isAdDueThisRestart() {
  restartsSinceLastAd += 1;
  if (restartsSinceLastAd >= AD_EVERY_N_RESTARTS) {
    restartsSinceLastAd = 0;
    return true;
  }
  return false;
}

// If the SDK never calls back at all (a real-world bug we've seen platforms
// hit), this is the longest we'll let the restart button stay dead before
// forcing it through anyway.
const AD_CALLBACK_TIMEOUT_MS = 6000;

/**
 * Shows a fullscreen interstitial ad, then calls `onDone` — whether the ad
 * played, failed, or the SDK isn't available at all. Callers should always
 * gate the actual restart behind `onDone` so a blocked/errored ad never
 * softlocks the game. Guarded so `onDone` fires exactly once, even if the
 * SDK both calls back AND we hit the timeout fallback.
 */
export function showFullscreenAd(onDone) {
  if (!ysdk?.adv) {
    onDone();
    return;
  }

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);
    onDone();
  };
  const timeoutId = setTimeout(finish, AD_CALLBACK_TIMEOUT_MS);

  ysdk.adv.showFullscreenAdv({
    callbacks: {
      onClose: finish,
      onError: finish,
      onOffline: finish,
    },
  });
}
