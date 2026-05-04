// Apple Game Center achievement & leaderboard ids and metadata.
// Keep these ids in sync with what's configured in App Store Connect.
//
// IDs are stable and ALL_CAPS — never change them once published, even if you
// rename the achievement. Apple identifies the achievement by id, not name.

export const LEADERBOARDS = {
  BEST_SCORE: 'STACKUP_BEST_SCORE',
  DAILY_BEST: 'STACKUP_DAILY_BEST',
  TOTAL_BLOCKS: 'STACKUP_TOTAL_BLOCKS',
} as const;

export type LeaderboardId = (typeof LEADERBOARDS)[keyof typeof LEADERBOARDS];

export const ACHIEVEMENTS = {
  FIRST_10: 'STACKUP_FIRST_10',
  SCORE_25: 'STACKUP_SCORE_25',
  SCORE_50: 'STACKUP_SCORE_50',
  SCORE_100: 'STACKUP_SCORE_100',
  PERFECT_5: 'STACKUP_PERFECT_5',
  PERFECT_10: 'STACKUP_PERFECT_10',
  PLAYS_10: 'STACKUP_PLAYS_10',
  PLAYS_100: 'STACKUP_PLAYS_100',
  TOTAL_500: 'STACKUP_TOTAL_500',
  TOTAL_2500: 'STACKUP_TOTAL_2500',
} as const;

export type AchievementId = (typeof ACHIEVEMENTS)[keyof typeof ACHIEVEMENTS];

// Score-based one-shots: unlocked when reached.
export const SCORE_ACHIEVEMENTS: { id: AchievementId; threshold: number }[] = [
  { id: ACHIEVEMENTS.FIRST_10, threshold: 10 },
  { id: ACHIEVEMENTS.SCORE_25, threshold: 25 },
  { id: ACHIEVEMENTS.SCORE_50, threshold: 50 },
  { id: ACHIEVEMENTS.SCORE_100, threshold: 100 },
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
