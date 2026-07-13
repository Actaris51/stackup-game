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

// v1.1.2 keys:
const DAILY_STREAK_KEY = 'stackup_daily_streak';      // consecutive-day count
const DAILY_STREAK_LAST_KEY = 'stackup_daily_streak_last'; // YYYY-MM-DD of last play day
const ONBOARDING_SEEN_KEY = 'stackup_onboarding_seen'; // first-run tutorial flag

// v1.2 keys:
const AD_UNLOCKS_KEY = 'stackup_ad_unlocks'; // unlock-rule ids granted via rewarded ad
const DAILY_CHALLENGE_LAST_KEY = 'stackup_daily_challenge_last'; // YYYY-MM-DD of last completed daily run
const DAILY_CHALLENGE_SCORE_KEY = 'stackup_daily_challenge_score'; // score achieved on that day
const ADS_REMOVED_KEY = 'stackup_ads_removed'; // "Remove Ads" IAP owned (non-consumable)
const NOTIF_ASKED_KEY = 'stackup_notif_asked'; // contextual notification permission already requested

/**
 * Sequencer for read-modify-write critical sections on AsyncStorage.
 * Without this, two near-simultaneous game-overs (rare but possible in
 * background-tab edge cases) could each read the same count, increment it,
 * and write back — losing one increment. We chain awaiters on a single
 * Promise so only one mutation is in flight per key family.
 */
let writeChain: Promise<unknown> = Promise.resolve();
function serialize<T>(op: () => Promise<T>): Promise<T> {
  const next = writeChain.then(op, op);
  // Detach failure propagation — one failure must not break the chain.
  writeChain = next.catch(() => undefined);
  return next;
}

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
  return serialize(async () => {
    const value = await AsyncStorage.getItem(GAMES_PLAYED_KEY);
    const count = (value ? parseInt(value, 10) : 0) + 1;
    await AsyncStorage.setItem(GAMES_PLAYED_KEY, count.toString());
    return count;
  });
}

// --- Total blocks placed across all games (for leaderboard + achievements) ---
export async function getTotalBlocks(): Promise<number> {
  const value = await AsyncStorage.getItem(TOTAL_BLOCKS_KEY);
  return value ? parseInt(value, 10) : 0;
}

export async function addBlocksToTotal(delta: number): Promise<number> {
  if (delta <= 0) return getTotalBlocks();
  return serialize(async () => {
    const current = await getTotalBlocks();
    const next = current + delta;
    await AsyncStorage.setItem(TOTAL_BLOCKS_KEY, next.toString());
    return next;
  });
}

// --- Max perfect streak (for the PERFECT_* achievements; capture across all games) ---
export async function getMaxPerfectStreak(): Promise<number> {
  const value = await AsyncStorage.getItem(MAX_PERFECT_STREAK_KEY);
  return value ? parseInt(value, 10) : 0;
}

export async function updateMaxPerfectStreak(streak: number): Promise<number> {
  return serialize(async () => {
    const current = await getMaxPerfectStreak();
    if (streak <= current) return current;
    await AsyncStorage.setItem(MAX_PERFECT_STREAK_KEY, streak.toString());
    return streak;
  });
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
  return serialize(async () => {
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
  });
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

// --- v1.2: ad-granted unlocks (rewarded "unlock now" on locked themes) ---
// Stored as unlock-rule ids (e.g. "theme:galaxy") so they compose directly
// with the UNLOCK_RULES system: a theme is available when its rule is met
// OR its id is in this list.
export async function getAdUnlocks(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(AD_UNLOCKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function addAdUnlock(unlockId: string): Promise<void> {
  return serialize(async () => {
    const unlocks = await getAdUnlocks();
    if (unlocks.includes(unlockId)) return;
    unlocks.push(unlockId);
    await AsyncStorage.setItem(AD_UNLOCKS_KEY, JSON.stringify(unlocks));
  });
}

// --- v1.2: daily challenge (one seeded attempt per day) ---
export async function getDailyChallengeStatus(): Promise<{
  playedToday: boolean;
  todayScore: number;
}> {
  const [last, rawScore] = await Promise.all([
    AsyncStorage.getItem(DAILY_CHALLENGE_LAST_KEY),
    AsyncStorage.getItem(DAILY_CHALLENGE_SCORE_KEY),
  ]);
  const playedToday = last === todayLocalISO();
  return {
    playedToday,
    todayScore: playedToday && rawScore ? parseInt(rawScore, 10) : 0,
  };
}

/** Marks today's attempt as consumed and stores its score. */
export async function recordDailyChallengeScore(score: number): Promise<void> {
  return serialize(async () => {
    await AsyncStorage.multiSet([
      [DAILY_CHALLENGE_LAST_KEY, todayLocalISO()],
      [DAILY_CHALLENGE_SCORE_KEY, String(score)],
    ]);
  });
}

// --- v1.2: "Remove Ads" IAP entitlement flag ---
// Written by utils/purchases.ts (purchase, restore, silent sync). Read by
// utils/ads.ts to skip interstitials. Rewarded ads are NOT gated: they are
// player-initiated value exchanges (Continue, theme unlock) and stay
// available to buyers.
export async function isAdsRemoved(): Promise<boolean> {
  return (await AsyncStorage.getItem(ADS_REMOVED_KEY)) === '1';
}

export async function setAdsRemoved(removed: boolean): Promise<void> {
  if (removed) {
    await AsyncStorage.setItem(ADS_REMOVED_KEY, '1');
  } else {
    await AsyncStorage.removeItem(ADS_REMOVED_KEY);
  }
}

// --- v1.2: contextual notification-permission ask (once ever) ---
export async function isNotifPermissionAsked(): Promise<boolean> {
  return (await AsyncStorage.getItem(NOTIF_ASKED_KEY)) === '1';
}

export async function markNotifPermissionAsked(): Promise<void> {
  await AsyncStorage.setItem(NOTIF_ASKED_KEY, '1');
}

/** True if the daily streak was already ticked today (app opened today). */
export async function hasPlayedStreakToday(): Promise<boolean> {
  const last = await AsyncStorage.getItem(DAILY_STREAK_LAST_KEY);
  return last === todayLocalISO();
}

// --- v1.1.2: daily play streak ---
// Increments by 1 if the previous play day was exactly yesterday, resets to
// 1 on any first-play-of-day after a gap, and is a no-op if the user already
// played today. Returns the streak count after the update.
//
// Day boundaries are evaluated in the device's local timezone via the
// ISO-format YYYY-MM-DD string so DST shifts or travel can't accidentally
// break a streak (one wall-clock day always equals one streak day).

export function todayLocalISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffInDays(a: string, b: string): number {
  // Inputs are YYYY-MM-DD; reconstruct as UTC midnights to dodge DST drift.
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((aMs - bMs) / 86400000);
}

export async function getDailyStreak(): Promise<number> {
  const value = await AsyncStorage.getItem(DAILY_STREAK_KEY);
  return value ? parseInt(value, 10) : 0;
}

/**
 * Update the streak based on today's play. Idempotent across multiple calls
 * on the same day. Returns the streak count *after* this update.
 */
export async function tickDailyStreak(): Promise<number> {
  return serialize(async () => {
    const today = todayLocalISO();
    const last = await AsyncStorage.getItem(DAILY_STREAK_LAST_KEY);
    const currentStreak = parseInt(
      (await AsyncStorage.getItem(DAILY_STREAK_KEY)) ?? '0',
      10
    );

    if (last === today) {
      // Already played today — no change.
      return currentStreak || 1;
    }

    let next: number;
    if (!last) {
      next = 1;
    } else {
      const gap = diffInDays(today, last);
      if (gap === 1) next = currentStreak + 1;
      else if (gap <= 0) next = currentStreak || 1; // clock skew safeguard
      else next = 1; // streak broken, restart at 1
    }

    await AsyncStorage.multiSet([
      [DAILY_STREAK_KEY, String(next)],
      [DAILY_STREAK_LAST_KEY, today],
    ]);
    return next;
  });
}

// --- v1.1.2: first-launch onboarding ---
export async function isOnboardingSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === '1';
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
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
