// Daily Challenge — one date-seeded run per day, same for every player.
//
// The game engine is fully deterministic given its Difficulty parameters
// (no randomness: fixed spawn side, deterministic speed ramp), so two players
// facing the same synthesized Difficulty face the *exact same game*. That
// makes the recurring 24h Game Center leaderboard (STACKUP_DAILY_BEST) a fair
// skill contest.
//
// Design constraint: daily parameters are always AT LEAST Classic difficulty
// (speed ≥ 1.0×, width ≤ 1.0×, tolerance ≤ 5). Score achievements fire in
// daily runs (hasLeaderboard=true), so an easier-than-Classic day would let
// players farm them. Harder-only keeps everything legit.

import { DIFFICULTIES, type Difficulty } from '../constants';
import { todayLocalISO } from './storage';

export interface DailyChallenge {
  /** Local YYYY-MM-DD the challenge is for. */
  dateKey: string;
  /** Synthesized difficulty (id 'daily') with today's parameters. */
  difficulty: Difficulty;
  /** Short French label describing today's twist (shown on the Home card). */
  label: string;
}

/** FNV-style string hash → 32-bit unsigned seed. */
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32 — tiny deterministic PRNG, plenty for 4 parameter rolls. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build today's challenge. Deterministic: same date → same parameters and
 * label on every device (dates are local, like the daily streak — a "day"
 * is the player's wall-clock day).
 */
export function getDailyChallenge(now = new Date()): DailyChallenge {
  const dateKey = todayLocalISO(now);
  const rand = mulberry32(hashSeed(`stackup-daily-${dateKey}`));

  const speedRoll = rand();
  const widthRoll = rand();
  const incrRoll = rand();
  const tolRoll = rand();

  const initialSpeedMul = 1.0 + speedRoll * 0.35; // 1.00–1.35
  const initialBlockWidthMul = 1.0 - widthRoll * 0.2; // 0.80–1.00
  const speedIncrementMul = 1.0 + incrRoll * 0.4; // 1.0–1.4
  const maxSpeedMul = 1.0 + speedRoll * 0.25; // cap follows the speed roll
  const perfectTolerance = tolRoll < 0.3 ? 4 : 5;

  let label: string;
  if (speedRoll > 0.65 && widthRoll > 0.65) label = '🌪️ Tempête totale';
  else if (speedRoll > 0.65) label = '⚡ Vitesse folle';
  else if (widthRoll > 0.65) label = '📏 Blocs étroits';
  else if (incrRoll > 0.7) label = '🚀 Accélération brutale';
  else if (perfectTolerance === 4) label = '🎯 Précision exigée';
  else label = '⚖️ Équilibre du jour';

  const difficulty: Difficulty = {
    ...DIFFICULTIES.daily,
    initialSpeedMul,
    maxSpeedMul,
    speedIncrementMul,
    initialBlockWidthMul,
    perfectTolerance,
  };

  return { dateKey, difficulty, label };
}
