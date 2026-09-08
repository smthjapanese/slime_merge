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
    scheduleNextStep();
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
// A ~20-second casual-mobile-game-style tune (think Angry Birds/Candy
// Crush) — a bright triangle-wave melody built from short 4-note "cells"
// arranged into three distinct sections (A a main hook, B a variation, C a
// bridge) played as A-B-C-B-A, with a soft sine bass note under the first
// note of each cell for a little harmonic body. Earlier attempts were a
// single short riff on repeat, which read as thin/repetitive regardless of
// which notes or timbre it used — real variety across a longer loop is
// what actually reads as a proper little song instead of a jingle.

const STEP_DURATION_S = 0.25;
const MELODY_VOLUME = 0.05;
const BASS_VOLUME = 0.025;
const MELODY_ENVELOPE_S = 0.22; // a touch under STEP_DURATION_S so notes stay separated
const BASS_ENVELOPE_S = STEP_DURATION_S * 3.5; // sustains softly under the rest of its cell

// C major scale, spanning two octaves — every melody note below is one of
// these, so nothing can land on a dissonant or sad-sounding tone.
const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const F4 = 349.23;
const G4 = 392.0;
const A4 = 440.0;
const B4 = 493.88;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const F5 = 698.46;
const G5 = 783.99;

// Four-note melodic building blocks ("cells"). `null` is a rest.
const CELLS = {
  a1: [C5, E5, G5, E5],
  a2: [D5, C5, B4, G4],
  a4: [F5, D5, C5, null],
  b1: [G4, B4, D5, B4],
  b2: [A4, G4, F4, D4],
  b3: [C5, D5, E5, D5],
  b4: [G4, E4, C4, null],
  c1: [C5, D5, E5, F5],
  c2: [G5, G5, F5, E5],
  c3: [D5, C5, B4, A4],
  c4: [G4, E4, C4, null],
};

// Each section strings four cells together and carries its own bass root,
// so the soft pulse underneath still outlines a simple I-V-IV-V harmony.
const SECTION_A = { cells: [CELLS.a1, CELLS.a2, CELLS.a1, CELLS.a4], bassRoot: 130.81 }; // C3 (I)
const SECTION_B = { cells: [CELLS.b1, CELLS.b2, CELLS.b3, CELLS.b4], bassRoot: 98.0 }; // G2 (V)
const SECTION_C = { cells: [CELLS.c1, CELLS.c2, CELLS.c3, CELLS.c4], bassRoot: 87.31 }; // F2 (IV)

// The full ~20s loop: the main hook, a variation, a bridge, the variation
// again, then the hook returns — three distinct musical ideas instead of
// one short phrase on repeat.
const SONG_SECTIONS = [SECTION_A, SECTION_B, SECTION_C, SECTION_B, SECTION_A];

function buildMusicSteps() {
  const steps = [];
  for (const section of SONG_SECTIONS) {
    for (const cell of section.cells) {
      cell.forEach((freq, i) => {
        steps.push({ melody: freq, bass: i === 0 ? section.bassRoot : null });
      });
    }
  }
  return steps;
}

const MUSIC_STEPS = buildMusicSteps();

let musicRequested = false; // has the game asked for music at all this session
let musicStepIndex = 0;
let musicTimeoutId = null;

function playMusicNote(ctx, now, freq, volume, type, duration) {
  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

function scheduleNextStep() {
  const ctx = getAudioContext();
  if (!ctx || muted || !musicRequested) return;

  try {
    const now = ctx.currentTime;
    const step = MUSIC_STEPS[musicStepIndex % MUSIC_STEPS.length];
    if (step.melody != null) {
      playMusicNote(ctx, now, step.melody, MELODY_VOLUME, 'triangle', MELODY_ENVELOPE_S);
    }
    if (step.bass != null) {
      playMusicNote(ctx, now, step.bass, BASS_VOLUME, 'sine', BASS_ENVELOPE_S);
    }
  } catch (error) {
    console.warn('[sound] music playback failed, continuing without it:', error);
  }

  musicStepIndex += 1;
  musicTimeoutId = setTimeout(scheduleNextStep, STEP_DURATION_S * 1000);
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
  scheduleNextStep();
}

/** Stops the background loop entirely (not just muting it). */
export function stopBackgroundMusic() {
  musicRequested = false;
  stopMusicPlayback();
}
