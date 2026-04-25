import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_SCORE_KEY = 'stackup_high_score';
const GAMES_PLAYED_KEY = 'stackup_games_played';

export async function getHighScore(): Promise<number> {
  const value = await AsyncStorage.getItem(HIGH_SCORE_KEY);
  return value ? parseInt(value, 10) : 0;
}

export async function setHighScore(score: number): Promise<void> {
  await AsyncStorage.setItem(HIGH_SCORE_KEY, score.toString());
}

export async function incrementGamesPlayed(): Promise<number> {
  const value = await AsyncStorage.getItem(GAMES_PLAYED_KEY);
  const count = (value ? parseInt(value, 10) : 0) + 1;
  await AsyncStorage.setItem(GAMES_PLAYED_KEY, count.toString());
  return count;
}
