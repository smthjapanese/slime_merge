// Procedural sound effects and background music (Web Audio oscillators — no
// audio asset files, keeps the Yandex Games build tiny) plus haptic
// feedback. All of it is gated behind the same mute flag, persisted so the
// player's choice survives a reload.

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
  if (muted) {
    stopMusicPlayback();
  } else if (musicRequested) {
    scheduleNextNote();
  }
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
 * envelope, optionally sliding to a different frequency. All one-shot
 * effects below are built from this one primitive.
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
  playTone({ startFreq: 160, endFreq: 90, duration: 0.1, volume: 0.16, type: 'triangle' });
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

/** Bright ascending arpeggio for crossing a score milestone (awards the wildcard bonus slime). */
export function playBonus() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone({ startFreq: freq, duration: 0.16, volume: 0.18, type: 'triangle' }), i * 70);
  });
  vibrate([20, 30, 20, 30, 20]);
}

// --- Background music ------------------------------------------------------
//
// A light, airy melody phrase — soft sine notes tracing a gentle rise-and-
// fall shape in C major pentatonic (no minor tones, so it stays cheerful),
// with real silence between phrase repeats. Earlier attempts read as an
// 8-bit game jingle ("like Tetris") because of a square-wave timbre and a
// tight, driving "oom-pa" bassline looping with no breathing room — a soft
// sine tone and a phrase that pauses before repeating is what actually
// reads as light and unobtrusive rather than insistent.

const MUSIC_VOLUME = 0.045;
const MUSIC_NOTE_ENVELOPE_S = 0.3; // how long each note rings out
const MUSIC_NOTE_INTERVAL_S = 0.42; // gap to the next note's start (> envelope, so notes breathe)
const MUSIC_REST_S = 1.4; // silence after each full phrase before it repeats

// A gentle rise-and-fall phrase in C major pentatonic (C D E G A) — every
// note in this scale is consonant with every other, so there's no way for
// it to land on anything dissonant or sad, even without any harmony under it.
const MUSIC_PHRASE_HZ = [523.25, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25];

let musicRequested = false; // has the game asked for music at all this session
let musicNoteIndex = 0;
let musicTimeoutId = null;

function scheduleNextNote() {
  const ctx = getAudioContext();
  if (!ctx || muted || !musicRequested) return;

  if (musicNoteIndex >= MUSIC_PHRASE_HZ.length) {
    musicNoteIndex = 0;
    musicTimeoutId = setTimeout(scheduleNextNote, MUSIC_REST_S * 1000);
    return;
  }

  try {
    const now = ctx.currentTime;
    const freq = MUSIC_PHRASE_HZ[musicNoteIndex];

    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);

    // A soft attack and a gentle decay that finishes before the next note
    // starts, so notes stay separated like a chime instead of blurring
    // into a continuous drone.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(MUSIC_VOLUME, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + MUSIC_NOTE_ENVELOPE_S);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + MUSIC_NOTE_ENVELOPE_S + 0.05);
  } catch (error) {
    console.warn('[sound] music playback failed, continuing without it:', error);
  }

  musicNoteIndex += 1;
  musicTimeoutId = setTimeout(scheduleNextNote, MUSIC_NOTE_INTERVAL_S * 1000);
}

function stopMusicPlayback() {
  if (musicTimeoutId != null) {
    clearTimeout(musicTimeoutId);
    musicTimeoutId = null;
  }
}

/**
 * Starts the looping background track if it isn't already running. Safe to
 * call repeatedly (e.g. on every resume) — a no-op once the loop is going.
 * Call from a user-gesture path alongside primeAudio().
 */
export function startBackgroundMusic() {
  musicRequested = true;
  if (muted || musicTimeoutId != null) return;
  scheduleNextNote();
}

/** Stops the background loop entirely (not just muting it). */
export function stopBackgroundMusic() {
  musicRequested = false;
  stopMusicPlayback();
}
