// Apple Game Center wrapper.
//
// All functions are no-ops on Android and on web. On iOS they call a local
// Expo native module (see modules/game-center/). The native module is loaded
// lazily so the bundle still works in Expo Go (where it's absent).
//
// Auth is best-effort and silent: if the user is not signed into Game Center,
// or declines, every function below resolves cleanly without error so game UX
// is never blocked on Game Center.

import { AppState, Platform } from 'react-native';
import { getDifficulty, type DifficultyId } from '../constants';
import {
  ACHIEVEMENTS,
  AchievementId,
  LEADERBOARDS,
  LeaderboardId,
  MODE_SCORE_ACHIEVEMENTS,
  PERFECT_ACHIEVEMENTS,
  PROGRESS_ACHIEVEMENTS,
  SCORE_ACHIEVEMENTS,
} from './achievements';

interface GameCenterNativeModule {
  authenticate(): Promise<{ authenticated: boolean; playerId?: string; displayName?: string }>;
  submitScore(leaderboardId: string, score: number): Promise<void>;
  unlockAchievement(achievementId: string): Promise<void>;
  reportProgress(achievementId: string, percentComplete: number): Promise<void>;
  showLeaderboard(leaderboardId?: string): Promise<void>;
  showAchievements(): Promise<void>;
  showGameCenter(): Promise<void>;
}

let nativeModule: GameCenterNativeModule | null = null;
let isAuthenticated = false;
// In-flight Promise cache so concurrent callers all await the same auth call.
// Pattern: identical to `initPromise` in ads.ts. Replaces the previous
// `authAttempted` boolean which had a TOCTOU bug — callers racing while the
// Swift sign-in modal was still up would short-circuit with stale `false`.
let authPromise: Promise<boolean> | null = null;

if (Platform.OS === 'ios') {
  try {
    // The local module's package name. Its presence depends on a native build —
    // it is absent in Expo Go, hence the try/catch.
    nativeModule = require('../../modules/game-center').default ?? null;
  } catch {
    nativeModule = null;
  }
}

function safeCall<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  return fn().catch((err) => {
    console.log(`[GameCenter] ${label} failed`, err);
    return null;
  });
}

/**
 * Attempt silent auth. Safe to call multiple times — only the first triggers a
 * real call to the native module; subsequent (or concurrent) callers `await`
 * the same in-flight Promise and receive the same resolved value.
 *
 * Why not a boolean flag? A `let attempted = false; attempted = true;` flag set
 * BEFORE the native call creates a TOCTOU race: a second caller arriving while
 * the Swift sign-in modal is still up sees `attempted=true` and short-circuits
 * with the stale `isAuthenticated=false`, even though the first call may
 * eventually succeed. Caching the Promise itself fixes this.
 */
export async function authenticate(): Promise<boolean> {
  if (authPromise) return authPromise;
  if (!nativeModule) return false;

  authPromise = (async () => {
    const result = await safeCall('authenticate', () => nativeModule!.authenticate());
    isAuthenticated = !!result?.authenticated;
    if (isAuthenticated) {
      console.log('[GameCenter] Authenticated as', result?.displayName ?? result?.playerId);
    } else {
      console.log('[GameCenter] Not authenticated (user declined or signed out)');
    }
    return isAuthenticated;
  })();

  return authPromise;
}

/**
 * Re-attempt silent auth from scratch. Used by the AppState listener to
 * pick up sign-in / sign-out changes the user makes outside the app via
 * iOS Settings — without this, the JS layer would keep believing it was
 * authed after a sign-out and submit scores that silently fail.
 */
export async function reauthenticate(): Promise<boolean> {
  authPromise = null;
  isAuthenticated = false;
  return authenticate();
}

// Re-check auth whenever the app returns to the foreground. The user could
// have toggled Game Center off (or on) in Réglages during the trip away.
let appStateSubInstalled = false;
export function installGameCenterAppStateListener() {
  if (appStateSubInstalled) return;
  if (Platform.OS !== 'ios' || !nativeModule) return;
  appStateSubInstalled = true;
  let prev = AppState.currentState;
  AppState.addEventListener('change', (next) => {
    if (prev !== 'active' && next === 'active') {
      // Fire-and-forget — failure is non-fatal.
      reauthenticate().catch(() => {});
    }
    prev = next;
  });
}

export function isGameCenterAvailable(): boolean {
  return Platform.OS === 'ios' && nativeModule !== null;
}

export function isGameCenterAuthenticated(): boolean {
  return isAuthenticated;
}

async function submitScore(leaderboardId: LeaderboardId, score: number): Promise<void> {
  if (!nativeModule || !isAuthenticated) return;
  await safeCall(`submitScore ${leaderboardId}`, () =>
    nativeModule!.submitScore(leaderboardId, score)
  );
}

async function unlockAchievement(achievementId: AchievementId): Promise<void> {
  if (!nativeModule || !isAuthenticated) return;
  await safeCall(`unlockAchievement ${achievementId}`, () =>
    nativeModule!.unlockAchievement(achievementId)
  );
}

async function reportProgress(achievementId: AchievementId, percent: number): Promise<void> {
  if (!nativeModule || !isAuthenticated) return;
  const clamped = Math.max(0, Math.min(100, percent));
  await safeCall(`reportProgress ${achievementId}`, () =>
    nativeModule!.reportProgress(achievementId, clamped)
  );
}

/**
 * Maps a difficulty mode to its dedicated "best score" leaderboard.
 * Modes without a leaderboard (chill, zen) are absent on purpose.
 */
const MODE_TO_BEST_LEADERBOARD: Partial<Record<DifficultyId, LeaderboardId>> = {
  classic: LEADERBOARDS.BEST_SCORE, // v1.0 leaderboard kept for Classic
  hard: LEADERBOARDS.BEST_HARD,
  insane: LEADERBOARDS.BEST_INSANE,
};

/** Submit all relevant scores after a game ends. */
export async function submitGameOverScores(opts: {
  finalScore: number;
  totalBlocks: number;
  difficulty: DifficultyId;
}): Promise<void> {
  if (!isAuthenticated) return;

  const diff = getDifficulty(opts.difficulty);
  const tasks: Promise<void>[] = [];

  // Total blocks: cumulative across ALL modes (Zen and Chill included).
  tasks.push(submitScore(LEADERBOARDS.TOTAL_BLOCKS, opts.totalBlocks));

  if (diff.hasLeaderboard) {
    // Cross-mode daily best (only competitive modes contribute).
    tasks.push(submitScore(LEADERBOARDS.DAILY_BEST, opts.finalScore));
    // Per-mode best leaderboard.
    const board = MODE_TO_BEST_LEADERBOARD[opts.difficulty];
    if (board) tasks.push(submitScore(board, opts.finalScore));
  }

  await Promise.all(tasks);
}

/** Check + unlock achievements based on game results and cumulative stats. */
export async function processAchievements(opts: {
  finalScore: number;
  maxPerfectStreakInGame: number;
  gamesPlayed: number;
  totalBlocks: number;
  difficulty: DifficultyId;
}): Promise<void> {
  if (!isAuthenticated) return;

  const diff = getDifficulty(opts.difficulty);

  // Score milestones (one-shot) — only count in competitive modes so Chill
  // can't farm them.
  if (diff.hasLeaderboard) {
    for (const a of SCORE_ACHIEVEMENTS) {
      if (opts.finalScore >= a.threshold) {
        await unlockAchievement(a.id);
      }
    }
  }

  // Mode-specific score thresholds (Hard 50, Insane 25).
  for (const a of MODE_SCORE_ACHIEVEMENTS) {
    if (opts.difficulty === a.mode && opts.finalScore >= a.threshold) {
      await unlockAchievement(a.id);
    }
  }

  // Perfect streak (one-shot, in-game) — fire across all modes including Zen.
  for (const a of PERFECT_ACHIEVEMENTS) {
    if (opts.maxPerfectStreakInGame >= a.threshold) {
      await unlockAchievement(a.id);
    }
  }

  // Progress (incremental %) — always fire (totals are cumulative, not gamed).
  for (const a of PROGRESS_ACHIEVEMENTS) {
    const value = a.metric === 'gamesPlayed' ? opts.gamesPlayed : opts.totalBlocks;
    const percent = Math.min(100, (value / a.target) * 100);
    await reportProgress(a.id, percent);
  }
}

/** Open the native Game Center sheet (defaults to leaderboard view). */
export async function showLeaderboard(leaderboardId?: LeaderboardId): Promise<void> {
  if (!nativeModule) return;
  await safeCall('showLeaderboard', () => nativeModule!.showLeaderboard(leaderboardId));
}

export async function showAchievements(): Promise<void> {
  if (!nativeModule) return;
  await safeCall('showAchievements', () => nativeModule!.showAchievements());
}

export async function showGameCenter(): Promise<void> {
  if (!nativeModule) return;
  await safeCall('showGameCenter', () => nativeModule!.showGameCenter());
}

// Re-export ids for convenience
export { ACHIEVEMENTS, LEADERBOARDS };
