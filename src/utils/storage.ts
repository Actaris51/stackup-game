import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_SCORE_KEY = 'stackup_high_score';
const GAMES_PLAYED_KEY = 'stackup_games_played';
const TOTAL_BLOCKS_KEY = 'stackup_total_blocks';
const MAX_PERFECT_STREAK_KEY = 'stackup_max_perfect_streak';

// --- Best score (per-game high) ---
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
