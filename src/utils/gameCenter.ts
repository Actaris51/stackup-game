// Apple Game Center wrapper.
//
// All functions are no-ops on Android and on web. On iOS they call a local
// Expo native module (see modules/game-center/). The native module is loaded
// lazily so the bundle still works in Expo Go (where it's absent).
//
// Auth is best-effort and silent: if the user is not signed into Game Center,
// or declines, every function below resolves cleanly without error so game UX
// is never blocked on Game Center.

import { Platform } from 'react-native';
import {
  ACHIEVEMENTS,
  AchievementId,
  LEADERBOARDS,
  LeaderboardId,
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
let authAttempted = false;

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

/** Attempt silent auth. Safe to call multiple times — only the first triggers a real call. */
export async function authenticate(): Promise<boolean> {
  if (authAttempted) return isAuthenticated;
  authAttempted = true;

  if (!nativeModule) return false;

  const result = await safeCall('authenticate', () => nativeModule!.authenticate());
  isAuthenticated = !!result?.authenticated;
  if (isAuthenticated) {
    console.log('[GameCenter] Authenticated as', result?.displayName ?? result?.playerId);
  } else {
    console.log('[GameCenter] Not authenticated (user declined or signed out)');
  }
  return isAuthenticated;
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

/** Submit all relevant scores after a game ends. */
export async function submitGameOverScores(opts: {
  finalScore: number;
  totalBlocks: number;
}): Promise<void> {
  if (!isAuthenticated) return;
  await Promise.all([
    submitScore(LEADERBOARDS.BEST_SCORE, opts.finalScore),
    submitScore(LEADERBOARDS.DAILY_BEST, opts.finalScore),
    submitScore(LEADERBOARDS.TOTAL_BLOCKS, opts.totalBlocks),
  ]);
}

/** Check + unlock achievements based on game results and cumulative stats. */
export async function processAchievements(opts: {
  finalScore: number;
  maxPerfectStreakInGame: number;
  gamesPlayed: number;
  totalBlocks: number;
}): Promise<void> {
  if (!isAuthenticated) return;

  // Score milestones (one-shot)
  for (const a of SCORE_ACHIEVEMENTS) {
    if (opts.finalScore >= a.threshold) {
      await unlockAchievement(a.id);
    }
  }

  // Perfect streak (one-shot, in-game)
  for (const a of PERFECT_ACHIEVEMENTS) {
    if (opts.maxPerfectStreakInGame >= a.threshold) {
      await unlockAchievement(a.id);
    }
  }

  // Progress (incremental %)
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
