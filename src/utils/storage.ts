import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_THEME_ID,
  type DifficultyId,
  type ThemeId,
} from '../constants';

// --- Storage keys ---
// v1.0 keys (kept under their original names for backward compat) :
const HIGH_SCORE_KEY = 'stackup_high_score'; // overall best across all modes
const GAMES_PLAYED_KEY = 'stackup_games_played';
const TOTAL_BLOCKS_KEY = 'stackup_total_blocks';
const MAX_PERFECT_STREAK_KEY = 'stackup_max_perfect_streak';

// v1.1 keys:
const HIGH_SCORE_PER_MODE_PREFIX = 'stackup_high_score_';
const ACTIVE_THEME_KEY = 'stackup_active_theme';
const ACTIVE_DIFFICULTY_KEY = 'stackup_active_difficulty';
const SEEN_UNLOCKS_KEY = 'stackup_seen_unlocks';
const V11_MIGRATION_DONE_KEY = 'stackup_v11_migration_done';

// --- Best score (overall) ---
export async function getHighScore(): Promise<number> {
  const value = await AsyncStorage.getItem(HIGH_SCORE_KEY);
  return value ? parseInt(value, 10) : 0;
}

export async function setHighScore(score: number): Promise<void> {
  await AsyncStorage.setItem(HIGH_SCORE_KEY, score.toString());
}

// --- Games played counter ---
export async function getGamesPlayed(): Promise<number> {
  const value = await AsyncStorage.getItem(GAMES_PLAYED_KEY);
  return value ? parseInt(value, 10) : 0;
}

export async function incrementGamesPlayed(): Promise<number> {
  const value = await AsyncStorage.getItem(GAMES_PLAYED_KEY);
  const count = (value ? parseInt(value, 10) : 0) + 1;
  await AsyncStorage.setItem(GAMES_PLAYED_KEY, count.toString());
  return count;
}

// --- Total blocks placed across all games (for leaderboard + achievements) ---
export async function getTotalBlocks(): Promise<number> {
  const value = await AsyncStorage.getItem(TOTAL_BLOCKS_KEY);
  return value ? parseInt(value, 10) : 0;
}

export async function addBlocksToTotal(delta: number): Promise<number> {
  if (delta <= 0) return getTotalBlocks();
  const current = await getTotalBlocks();
  const next = current + delta;
  await AsyncStorage.setItem(TOTAL_BLOCKS_KEY, next.toString());
  return next;
}

// --- Max perfect streak (for the PERFECT_* achievements; capture across all games) ---
export async function getMaxPerfectStreak(): Promise<number> {
  const value = await AsyncStorage.getItem(MAX_PERFECT_STREAK_KEY);
  return value ? parseInt(value, 10) : 0;
}

export async function updateMaxPerfectStreak(streak: number): Promise<number> {
  const current = await getMaxPerfectStreak();
  if (streak <= current) return current;
  await AsyncStorage.setItem(MAX_PERFECT_STREAK_KEY, streak.toString());
  return streak;
}

// --- v1.1: per-mode high scores ---
function modeHighScoreKey(mode: DifficultyId): string {
  return `${HIGH_SCORE_PER_MODE_PREFIX}${mode}`;
}

export async function getHighScoreForMode(mode: DifficultyId): Promise<number> {
  const value = await AsyncStorage.getItem(modeHighScoreKey(mode));
  return value ? parseInt(value, 10) : 0;
}

/**
 * Best score across competitive modes only (Classic, Hard, Insane).
 * Used as the canonical "bestScore" for unlock/achievement evaluation so the
 * easier modes (Chill) can't be used to grind progression.
 */
export async function getCompetitiveBestScore(): Promise<number> {
  const [classic, hard, insane] = await Promise.all([
    getHighScoreForMode('classic'),
    getHighScoreForMode('hard'),
    getHighScoreForMode('insane'),
  ]);
  return Math.max(classic, hard, insane);
}

/**
 * Persists score for a given mode if it's a new record. Also bumps the overall
 * cross-mode high score so the home screen "best ever" stays meaningful.
 * Returns true if either record was beaten.
 */
export async function setHighScoreForMode(
  mode: DifficultyId,
  score: number
): Promise<{ beatModeRecord: boolean; beatOverallRecord: boolean }> {
  let beatModeRecord = false;
  let beatOverallRecord = false;
  const currentMode = await getHighScoreForMode(mode);
  if (score > currentMode) {
    await AsyncStorage.setItem(modeHighScoreKey(mode), score.toString());
    beatModeRecord = true;
  }
  const overall = await getHighScore();
  if (score > overall) {
    await setHighScore(score);
    beatOverallRecord = true;
  }
  return { beatModeRecord, beatOverallRecord };
}

// --- v1.1: active theme ---
export async function getActiveTheme(): Promise<ThemeId> {
  const value = await AsyncStorage.getItem(ACTIVE_THEME_KEY);
  return (value as ThemeId) || DEFAULT_THEME_ID;
}

export async function setActiveTheme(id: ThemeId): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_THEME_KEY, id);
}

// --- v1.1: active difficulty ---
export async function getActiveDifficulty(): Promise<DifficultyId> {
  const value = await AsyncStorage.getItem(ACTIVE_DIFFICULTY_KEY);
  return (value as DifficultyId) || DEFAULT_DIFFICULTY_ID;
}

export async function setActiveDifficulty(id: DifficultyId): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_DIFFICULTY_KEY, id);
}

// --- v1.1: seen unlocks (so the toast only fires once per unlock) ---
export async function getSeenUnlocks(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SEEN_UNLOCKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function markUnlockSeen(unlockId: string): Promise<void> {
  const seen = await getSeenUnlocks();
  if (seen.includes(unlockId)) return;
  seen.push(unlockId);
  await AsyncStorage.setItem(SEEN_UNLOCKS_KEY, JSON.stringify(seen));
}

export async function markUnlocksSeen(unlockIds: string[]): Promise<void> {
  if (unlockIds.length === 0) return;
  const seen = await getSeenUnlocks();
  let changed = false;
  for (const id of unlockIds) {
    if (!seen.includes(id)) {
      seen.push(id);
      changed = true;
    }
  }
  if (changed) {
    await AsyncStorage.setItem(SEEN_UNLOCKS_KEY, JSON.stringify(seen));
  }
}

// --- v1.0 → v1.1 migration ---
// Run once on first v1.1 launch. Attributes the legacy single high score to
// Classic mode (since v1.0 only had Classic gameplay) and pre-marks any
// already-met unlocks as seen so we don't spam returning players with toasts.
export async function runV11MigrationIfNeeded(): Promise<void> {
  const done = await AsyncStorage.getItem(V11_MIGRATION_DONE_KEY);
  if (done) return;

  // 1. Backfill Classic mode high score from the legacy overall key.
  const legacy = await getHighScore();
  if (legacy > 0) {
    const classicCurrent = await getHighScoreForMode('classic');
    if (legacy > classicCurrent) {
      await AsyncStorage.setItem(modeHighScoreKey('classic'), legacy.toString());
    }
  }

  // 2. Pre-mark unlocks the player already qualifies for, so the toast UI
  //    surfaces only NEW unlocks earned post-upgrade.
  //    (We do this here rather than in unlocks.ts to avoid a circular import.)
  const totalBlocks = await getTotalBlocks();
  const gamesPlayed = await getGamesPlayed();
  const state = { bestScore: legacy, totalBlocks, gamesPlayed };
  // Inline import to dodge module-init order issues:
  const { UNLOCK_RULES, isUnlocked } = await import('../constants/unlocks');
  const alreadyMet = UNLOCK_RULES.filter((r) => isUnlocked(r, state)).map((r) => r.id);
  if (alreadyMet.length > 0) {
    await markUnlocksSeen(alreadyMet);
  }

  await AsyncStorage.setItem(V11_MIGRATION_DONE_KEY, '1');
}
