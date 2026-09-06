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
    scheduleNextChord();
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

// --- Background music ------------------------------------------------------
//
// A slow, quiet ambient pad loop — a handful of warm chords cycling
// continuously so the jar never sits in silence. Deliberately simple: each
// chord is just a few detuned sine waves with a slow fade in/out, scheduled
// back-to-back via setTimeout (a music-precision scheduler would be
// overkill for a loop this slow and ambient).

const MUSIC_CHORD_DURATION_S = 4.5;
const MUSIC_FADE_S = 1.5;
const MUSIC_VOLUME = 0.05; // quiet — ambience, not a soundtrack competing with SFX

// Warm, non-resolving triads/add9 voicings, picked to loop without feeling
// like it's "ending" on any one chord.
const MUSIC_CHORDS_HZ = [
  [130.81, 196.0, 246.94, 329.63], // C3 G3 B3 E4
  [146.83, 220.0, 277.18, 349.23], // D3 A3 C#4 F4
  [164.81, 246.94, 293.66, 392.0], // E3 B3 D4 G4
  [110.0, 164.81, 220.0, 293.66], // A2 E3 A3 D4
];

let musicRequested = false; // has the game asked for music at all this session
let musicChordIndex = 0;
let musicTimeoutId = null;

function scheduleNextChord() {
  const ctx = getAudioContext();
  if (!ctx || muted || !musicRequested) return;

  try {
    const now = ctx.currentTime;
    const freqs = MUSIC_CHORDS_HZ[musicChordIndex % MUSIC_CHORDS_HZ.length];
    musicChordIndex += 1;
    const noteVolume = MUSIC_VOLUME / freqs.length;

    for (const freq of freqs) {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(noteVolume, now + MUSIC_FADE_S);
      gain.gain.setValueAtTime(noteVolume, now + MUSIC_CHORD_DURATION_S - MUSIC_FADE_S);
      gain.gain.linearRampToValueAtTime(0, now + MUSIC_CHORD_DURATION_S);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + MUSIC_CHORD_DURATION_S + 0.1);
    }
  } catch (error) {
    console.warn('[sound] music playback failed, continuing without it:', error);
  }

  musicTimeoutId = setTimeout(scheduleNextChord, MUSIC_CHORD_DURATION_S * 1000);
}

function stopMusicPlayback() {
  if (musicTimeoutId != null) {
    clearTimeout(musicTimeoutId);
    musicTimeoutId = null;
  }
}

/**
 * Starts the looping ambient background track if it isn't already running.
 * Safe to call repeatedly (e.g. on every resume) — a no-op once the loop is
 * going. Call from a user-gesture path alongside primeAudio().
 */
export function startBackgroundMusic() {
  musicRequested = true;
  if (muted || musicTimeoutId != null) return;
  scheduleNextChord();
}

/** Stops the background loop entirely (not just muting it). */
export function stopBackgroundMusic() {
  musicRequested = false;
  stopMusicPlayback();
}
