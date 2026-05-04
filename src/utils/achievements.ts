// Apple Game Center achievement & leaderboard ids and metadata.
// Keep these ids in sync with what's configured in App Store Connect.
//
// IDs are stable and ALL_CAPS — never change them once published, even if you
// rename the achievement. Apple identifies the achievement by id, not name.

export const LEADERBOARDS = {
  // v1.0 — best score in Classic mode (kept under the original id for
  // backward compatibility with v1.0 entries already published to ASC).
  BEST_SCORE: 'STACKUP_BEST_SCORE',
  DAILY_BEST: 'STACKUP_DAILY_BEST',
  TOTAL_BLOCKS: 'STACKUP_TOTAL_BLOCKS',
  // v1.1 — per-difficulty leaderboards. Chill/Zen do not submit (see
  // constants/difficulties.ts hasLeaderboard flag).
  BEST_HARD: 'STACKUP_BEST_HARD',
  BEST_INSANE: 'STACKUP_BEST_INSANE',
} as const;

export type LeaderboardId = (typeof LEADERBOARDS)[keyof typeof LEADERBOARDS];

export const ACHIEVEMENTS = {
  FIRST_10: 'STACKUP_FIRST_10',
  SCORE_25: 'STACKUP_SCORE_25',
  SCORE_50: 'STACKUP_SCORE_50',
  SCORE_100: 'STACKUP_SCORE_100',
  // v1.1 elite tier — gates Galaxy theme.
  SCORE_150: 'STACKUP_SCORE_150',
  PERFECT_5: 'STACKUP_PERFECT_5',
  PERFECT_10: 'STACKUP_PERFECT_10',
  PLAYS_10: 'STACKUP_PLAYS_10',
  PLAYS_100: 'STACKUP_PLAYS_100',
  TOTAL_500: 'STACKUP_TOTAL_500',
  TOTAL_2500: 'STACKUP_TOTAL_2500',
  // v1.1 mode-mastery achievements (separate Hard/Insane progression).
  HARD_50: 'STACKUP_HARD_50',
  INSANE_25: 'STACKUP_INSANE_25',
} as const;

export type AchievementId = (typeof ACHIEVEMENTS)[keyof typeof ACHIEVEMENTS];

// Score-based one-shots: unlocked when reached.
export const SCORE_ACHIEVEMENTS: { id: AchievementId; threshold: number }[] = [
  { id: ACHIEVEMENTS.FIRST_10, threshold: 10 },
  { id: ACHIEVEMENTS.SCORE_25, threshold: 25 },
  { id: ACHIEVEMENTS.SCORE_50, threshold: 50 },
  { id: ACHIEVEMENTS.SCORE_100, threshold: 100 },
  { id: ACHIEVEMENTS.SCORE_150, threshold: 150 },
];

// Mode-specific one-shot thresholds. Triggered only when the current game's
// difficulty matches the mode tag.
export const MODE_SCORE_ACHIEVEMENTS: {
  id: AchievementId;
  mode: 'hard' | 'insane';
  threshold: number;
}[] = [
  { id: ACHIEVEMENTS.HARD_50, mode: 'hard', threshold: 50 },
  { id: ACHIEVEMENTS.INSANE_25, mode: 'insane', threshold: 25 },
];

// Perfect-streak one-shots: unlocked when streak reaches threshold in a single game.
export const PERFECT_ACHIEVEMENTS: { id: AchievementId; threshold: number }[] = [
  { id: ACHIEVEMENTS.PERFECT_5, threshold: 5 },
  { id: ACHIEVEMENTS.PERFECT_10, threshold: 10 },
];

// Cumulative-progress achievements: report % completion after every game.
// Apple awards once it reaches 100. Submitting a smaller % later is a no-op.
export const PROGRESS_ACHIEVEMENTS: {
  id: AchievementId;
  target: number;
  metric: 'gamesPlayed' | 'totalBlocks';
}[] = [
  { id: ACHIEVEMENTS.PLAYS_10, target: 10, metric: 'gamesPlayed' },
  { id: ACHIEVEMENTS.PLAYS_100, target: 100, metric: 'gamesPlayed' },
  { id: ACHIEVEMENTS.TOTAL_500, target: 500, metric: 'totalBlocks' },
  { id: ACHIEVEMENTS.TOTAL_2500, target: 2500, metric: 'totalBlocks' },
];
