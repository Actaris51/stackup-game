// Sound effects wrapper.
//
// History: the original implementation used the Web Audio API directly,
// which only works in Expo Web. Through v1.1.1 the game shipped completely
// silent on iOS and Android — sounds were a no-op because
// `getAudioContext()` returned null on every non-web platform. v1.1.2
// switches to expo-audio with pre-rendered WAV files (see
// scripts/generate-sound-effects.py).
//
// Strategy: load four AudioPlayer instances once at boot via initSounds()
// and reuse them. Each play() call seeks back to 0 so rapid taps don't
// stack ringing copies. The previous play is cut off — acceptable for
// short percussive UI sounds and saves the bundle from needing a pool.

import { Platform } from 'react-native';

type SoundKey = 'place' | 'perfect' | 'combo' | 'gameOver';

// expo-audio is imported lazily so a missing module (e.g. web bundle without
// the polyfill, or Expo Go before a rebuild that includes the new dep)
// doesn't crash the boot path.
type AudioPlayer = {
  play(): void;
  seekTo(seconds: number): Promise<void>;
  remove(): void;
  volume: number;
};
type CreateAudioPlayer = (source: number) => AudioPlayer;

let createAudioPlayer: CreateAudioPlayer | null = null;
let players: Partial<Record<SoundKey, AudioPlayer>> = {};
let initStarted = false;

// Web Audio fallback — keeps the in-browser preview audible during dev.
let webAudioContext: AudioContext | null = null;

function getWebAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (!webAudioContext) {
    try {
      webAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch {
      webAudioContext = null;
    }
  }
  return webAudioContext;
}

/**
 * Preload the four sound effects. Idempotent + non-throwing. Call from App
 * boot before the user can trigger any sound — first play of an unloaded
 * sound will hit a silent first frame on most devices.
 */
export function initSounds(): void {
  if (initStarted) return;
  initStarted = true;
  if (Platform.OS === 'web') return; // web uses synthesized tones below
  try {
    // Inline require so non-native bundles don't pull expo-audio in.
    const audio = require('expo-audio');
    createAudioPlayer = audio.createAudioPlayer as CreateAudioPlayer;

    // Use require() so Metro resolves the asset and embeds it in the bundle.
    // Each WAV is < 30 KB; no remote network calls at runtime.
    const sources: Record<SoundKey, number> = {
      place: require('../../assets/sounds/place.wav'),
      perfect: require('../../assets/sounds/perfect.wav'),
      combo: require('../../assets/sounds/combo.wav'),
      gameOver: require('../../assets/sounds/gameOver.wav'),
    };
    (Object.keys(sources) as SoundKey[]).forEach((key) => {
      try {
        const player = createAudioPlayer!(sources[key]);
        // Slightly under unity gain — keeps SFX from drowning out the
        // ambient track + ad audio. Tune per-sound if needed.
        player.volume = 0.6;
        players[key] = player;
      } catch (e) {
        console.log(`[Sounds] Failed to load ${key}`, e);
      }
    });
  } catch (e) {
    console.log('[Sounds] expo-audio unavailable — sound will be silent', e);
  }
}

function playNative(key: SoundKey): void {
  const player = players[key];
  if (!player) return;
  // Fire-and-forget seek + play. If seekTo's promise rejects (rare) we
  // still call play() — at worst the sound starts from its previous
  // position which for these short clips is barely noticeable.
  player.seekTo(0).catch(() => {});
  player.play();
}

// --- Web fallback (dev only) ---
// Mirrors the original sounds.ts so `expo start --web` previews still have
// audio. On native this path is never reached because Platform.OS !== 'web'.

function webTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3
) {
  const ctx = getWebAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// --- Public API (called from GameScreen) ---

export function playPlaceSound(): void {
  if (Platform.OS === 'web') {
    webTone(800, 0.08, 'square', 0.15);
    return;
  }
  playNative('place');
}

export function playPerfectSound(): void {
  if (Platform.OS === 'web') {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => webTone(f, 0.3, 'sine', 0.2), i * 80);
    });
    return;
  }
  playNative('perfect');
}

export function playComboSound(_streak: number): void {
  // _streak parameter kept for API compatibility with the old per-tap pitch
  // shift; the pre-rendered WAV uses a fixed bright triplet regardless.
  if (Platform.OS === 'web') {
    [523, 723, 923].forEach((f, i) => {
      setTimeout(() => webTone(f, 0.25, 'sine', 0.25), i * 60);
    });
    return;
  }
  playNative('combo');
}

export function playGameOverSound(): void {
  if (Platform.OS === 'web') {
    webTone(400, 0.6, 'sawtooth', 0.15);
    return;
  }
  playNative('gameOver');
}
