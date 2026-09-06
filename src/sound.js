// Procedural sound effects (Web Audio oscillators — no audio asset files,
// keeps the Yandex Games build tiny) plus haptic feedback. Both are gated
// behind the same mute flag, persisted so the player's choice survives a
// reload.

const MUTE_KEY = 'slime-merge-muted';

let muted = localStorage.getItem(MUTE_KEY) === '1';

// Not every environment has Web Audio (older webviews, some test/CI
// environments) — resolved once, so the rest of this module can just check
// `AudioContextCtor` instead of every browser having its own quirk.
const AudioContextCtor =
  typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);

// Created lazily on the first user gesture — browsers block audio contexts
// from starting before one, and our first drop/click is exactly that gesture.
let audioContext = null;

function getAudioContext() {
  if (!AudioContextCtor) return null;
  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Creates/resumes the AudioContext. Call this synchronously from inside a
 * real user-gesture event handler (e.g. the first drop) — browsers suspend
 * audio contexts started outside one, and by the time a physics collision
 * actually fires a sound, the call stack is no longer "inside" the gesture.
 */
export function primeAudio() {
  if (!muted) getAudioContext();
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

/** Vibrates (if supported and not muted) — iOS Safari simply has no API, so this no-ops there. */
export function vibrate(pattern) {
  if (muted) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/**
 * Plays a short tone: a triangle-wave oscillator with an exponential decay
 * envelope, optionally sliding to a different frequency. All effects below
 * are built from this one primitive.
 */
function playTone({ startFreq, endFreq = startFreq, duration, volume = 0.2, type = 'sine' }) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return; // no Web Audio support — sound is a nice-to-have, never worth crashing over

  try {
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch (error) {
    console.warn('[sound] playback failed, continuing without it:', error);
  }
}

// Landing thuds fire on every collision — throttle so a settling pile
// doesn't turn into a wall of overlapping blips.
const THUD_COOLDOWN_MS = 70;
let lastThudAt = 0;

/** Soft low "boop" for a slime landing on the floor/another slime. */
export function playLandThud(now) {
  if (now - lastThudAt < THUD_COOLDOWN_MS) return;
  lastThudAt = now;
  playTone({ startFreq: 160, endFreq: 90, duration: 0.09, volume: 0.12, type: 'triangle' });
}

/** Rising chime for a merge — pitch climbs with the resulting level. */
export function playMerge(level) {
  const base = 260 + level * 40;
  playTone({ startFreq: base, endFreq: base * 1.8, duration: 0.18, volume: 0.22, type: 'sine' });
  vibrate(Math.min(40, 15 + level * 4));
}

/** Descending tone for game over. */
export function playGameOver() {
  playTone({ startFreq: 420, endFreq: 120, duration: 0.5, volume: 0.2, type: 'sawtooth' });
  vibrate([50, 40, 50]);
}
