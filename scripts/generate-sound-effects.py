"""Generate StackUp sound effects as short WAV files.

Background: the original src/utils/sounds.ts used the Web Audio API, which
only works in Expo web. On iOS/Android the game shipped completely silent
through v1.1.1. Rather than building a synthesizer at runtime (no native
WebAudio in React Native), we pre-render the same waveforms as small WAV
files at build time and load them via expo-audio.

Run: `python scripts/generate-sound-effects.py`
Outputs: assets/sounds/{place,perfect,combo,gameOver}.wav (16-bit PCM mono).

Sizes target < 30 KB per file so they sit comfortably in the JS bundle.
"""

import math
import os
import struct
import wave

SAMPLE_RATE = 22050  # 22 kHz mono is plenty for short percussive UI sounds
BIT_DEPTH = 16
MAX_AMP = 2 ** (BIT_DEPTH - 1) - 1


def _samples_to_wav(path: str, samples: list[float]) -> None:
    """Write mono 16-bit PCM, clipping to int16 range."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(BIT_DEPTH // 8)
        wav.setframerate(SAMPLE_RATE)
        clipped = []
        for s in samples:
            v = max(-1.0, min(1.0, s))
            clipped.append(int(v * MAX_AMP))
        wav.writeframes(b"".join(struct.pack("<h", v) for v in clipped))


def _tone(frequency: float, duration_s: float, *, volume: float = 0.3,
          shape: str = "sine", attack_s: float = 0.005, decay_s: float | None = None) -> list[float]:
    """Generate a single tone with linear attack and exponential decay."""
    if decay_s is None:
        decay_s = duration_s
    n = int(duration_s * SAMPLE_RATE)
    out: list[float] = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # Oscillator
        phase = 2 * math.pi * frequency * t
        if shape == "sine":
            wave_value = math.sin(phase)
        elif shape == "square":
            wave_value = 1.0 if math.sin(phase) >= 0 else -1.0
        elif shape == "sawtooth":
            # Naive sawtooth — fine for short sounds (no aliasing audible).
            wave_value = 2 * (frequency * t - math.floor(0.5 + frequency * t))
        else:
            wave_value = math.sin(phase)

        # Envelope: short linear attack, then exponential decay to silence.
        if t < attack_s:
            env = t / attack_s
        else:
            # Exponential decay: e^(-k * t) where k chosen so env hits ~0.001 at duration.
            decay_t = t - attack_s
            k = -math.log(0.001) / max(1e-4, decay_s - attack_s)
            env = math.exp(-k * decay_t)

        out.append(wave_value * env * volume)
    return out


def _noise(duration_s: float, *, volume: float = 0.1) -> list[float]:
    """Decaying white noise — used for percussive hits."""
    import random

    n = int(duration_s * SAMPLE_RATE)
    out: list[float] = []
    rng = random.Random(42)  # deterministic so the file is byte-stable across runs
    for i in range(n):
        # Cubic decay matches the original sounds.ts noise envelope.
        env = (1 - i / max(1, n)) ** 3
        sample = (rng.random() * 2 - 1) * env * volume
        out.append(sample)
    return out


def _mix(*tracks: list[float]) -> list[float]:
    """Mix variable-length tracks by length-padding the shorter ones."""
    longest = max(len(t) for t in tracks)
    mixed = [0.0] * longest
    for t in tracks:
        for i, v in enumerate(t):
            mixed[i] += v
    return mixed


def _layer(track: list[float], offset_s: float, layer: list[float]) -> list[float]:
    """Add a layer starting at offset_s into the base track."""
    start = int(offset_s * SAMPLE_RATE)
    out = list(track)
    if start + len(layer) > len(out):
        out.extend([0.0] * (start + len(layer) - len(out)))
    for i, v in enumerate(layer):
        out[start + i] += v
    return out


def make_place() -> list[float]:
    """A short percussive click — square wave at 800 Hz + noise."""
    tone = _tone(800, 0.08, volume=0.15, shape="square", decay_s=0.08)
    noise = _noise(0.06, volume=0.08)
    return _mix(tone, noise)


def make_perfect() -> list[float]:
    """Ascending sparkle chime — C5, E5, G5, C6 staggered every 80ms."""
    notes = [(523, 0.0), (659, 0.08), (784, 0.16), (1047, 0.24)]
    base: list[float] = []
    for freq, offset in notes:
        tone = _tone(freq, 0.30, volume=0.2, shape="sine", decay_s=0.25)
        base = _layer(base, offset, tone)
    return base


def make_combo(streak: int = 3) -> list[float]:
    """Three-note triplet pitched up by streak count.

    Pre-rendered for streak=3 (a reasonable middle-of-the-pack value).
    Run-time pitch shifting at the streak axis is dropped in favour of a
    single bright chord — the simplification keeps the bundle small and the
    original streak-dependent pitch wasn't critical for game feel.
    """
    base_freq = 523 + streak * 80
    delays = [0.0, 0.06, 0.12]
    base: list[float] = []
    for i, delay in enumerate(delays):
        freq = base_freq + i * 200
        tone = _tone(freq, 0.25, volume=0.25, shape="sine", decay_s=0.22)
        base = _layer(base, delay, tone)
    return base


def make_game_over() -> list[float]:
    """Descending sad swoop + low noise rumble."""
    n = int(0.6 * SAMPLE_RATE)
    swoop: list[float] = []
    # Sawtooth glissando from 400 Hz → 80 Hz over 0.6 s, exponential decay.
    for i in range(n):
        t = i / SAMPLE_RATE
        # Exponential frequency sweep matching sounds.ts
        # exp ramp: f(t) = 400 * (80/400)^(t / 0.6)
        freq = 400 * (80 / 400) ** (t / 0.6)
        phase_acc = 0.0  # naive — accumulate phase below
        # We can't accumulate phase incrementally without rebuilding state; instead
        # use a closed-form: integrate freq(t) dt for the phase. For an exponential
        # sweep f(t) = f0 * r^t where r = 80/400, integral is f0 * (r^t - 1) / ln(r).
        f0, r = 400.0, 80.0 / 400.0
        phase = 2 * math.pi * f0 * ((r ** t - 1) / math.log(r))
        env = math.exp(-5 * t)  # 5 ≈ -log(0.001)/0.6 ≈ 11.5; tune to taste
        # Naive sawtooth: keep within [-1, 1]
        v = 2 * ((phase / (2 * math.pi)) - math.floor(0.5 + phase / (2 * math.pi)))
        swoop.append(v * env * 0.15)
    rumble = _noise(0.4, volume=0.12)
    return _mix(swoop, rumble)


def main() -> None:
    base_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
    out = {
        "place.wav": make_place(),
        "perfect.wav": make_perfect(),
        "combo.wav": make_combo(streak=3),
        "gameOver.wav": make_game_over(),
    }
    for name, samples in out.items():
        path = os.path.join(base_dir, name)
        _samples_to_wav(path, samples)
        size_kb = os.path.getsize(path) // 1024
        print(f"  -> {path}  ({size_kb} KB, {len(samples)} samples)")


if __name__ == "__main__":
    main()
