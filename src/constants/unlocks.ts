// Unlock rules — what milestones gate which themes / difficulty modes.
//
// Reused from the Game Center achievement thresholds when possible (so the
// achievement popping up = the cosmetic getting unlocked, a single nice moment
// for the player). Only Galaxy theme requires a brand-new achievement
// (STACKUP_SCORE_150) which is added in utils/achievements.ts for v1.1.

import { ACHIEVEMENTS, type AchievementId } from '../utils/achievements';
import type { ThemeId } from './themes';
import type { DifficultyId } from './difficulties';

export type UnlockTarget =
  | { kind: 'theme'; id: ThemeId }
  | { kind: 'difficulty'; id: DifficultyId };

export type UnlockMetric = 'bestScore' | 'totalBlocks' | 'gamesPlayed';

export interface UnlockCondition {
  metric: UnlockMetric;
  threshold: number;
  /** Game Center achievement awarded at the same milestone (for messaging). */
  linkedAchievement?: AchievementId;
}

export interface UnlockRule {
  /** Stable id used for the seenUnlocks storage so we never re-toast. */
  id: string;
  target: UnlockTarget;
  condition: UnlockCondition;
}

export const UNLOCK_RULES: UnlockRule[] = [
  // --- Themes ---
  {
    id: 'theme:sunset',
    target: { kind: 'theme', id: 'sunset' },
    condition: { metric: 'bestScore', threshold: 25, linkedAchievement: ACHIEVEMENTS.SCORE_25 },
  },
  {
    id: 'theme:ocean',
    target: { kind: 'theme', id: 'ocean' },
    condition: { metric: 'bestScore', threshold: 50, linkedAchievement: ACHIEVEMENTS.SCORE_50 },
  },
  {
    id: 'theme:monochrome',
    target: { kind: 'theme', id: 'monochrome' },
    condition: { metric: 'bestScore', threshold: 100, linkedAchievement: ACHIEVEMENTS.SCORE_100 },
  },
  {
    id: 'theme:galaxy',
    target: { kind: 'theme', id: 'galaxy' },
    condition: {
      metric: 'bestScore',
      threshold: 150,
      linkedAchievement: ACHIEVEMENTS.SCORE_150,
    },
  },
  {
    id: 'theme:forest',
    target: { kind: 'theme', id: 'forest' },
    condition: {
      metric: 'totalBlocks',
      threshold: 500,
      linkedAchievement: ACHIEVEMENTS.TOTAL_500,
    },
  },
  {
    id: 'theme:neon',
    target: { kind: 'theme', id: 'neon' },
    condition: {
      metric: 'gamesPlayed',
      threshold: 100,
      linkedAchievement: ACHIEVEMENTS.PLAYS_100,
    },
  },

  // --- Difficulty modes ---
  {
    id: 'difficulty:hard',
    target: { kind: 'difficulty', id: 'hard' },
    condition: { metric: 'bestScore', threshold: 50, linkedAchievement: ACHIEVEMENTS.SCORE_50 },
  },
  {
    id: 'difficulty:insane',
    target: { kind: 'difficulty', id: 'insane' },
    condition: {
      metric: 'bestScore',
      threshold: 100,
      linkedAchievement: ACHIEVEMENTS.SCORE_100,
    },
  },
  {
    id: 'difficulty:zen',
    target: { kind: 'difficulty', id: 'zen' },
    condition: {
      metric: 'gamesPlayed',
      threshold: 100,
      linkedAchievement: ACHIEVEMENTS.PLAYS_100,
    },
  },
];

/** Snapshot of player progress used to evaluate unlock rules. */
export interface UnlockState {
  /** Best score across all modes. */
  bestScore: number;
  totalBlocks: number;
  gamesPlayed: number;
}

export function isUnlocked(rule: UnlockRule, state: UnlockState): boolean {
  switch (rule.condition.metric) {
    case 'bestScore':
      return state.bestScore >= rule.condition.threshold;
    case 'totalBlocks':
      return state.totalBlocks >= rule.condition.threshold;
    case 'gamesPlayed':
      return state.gamesPlayed >= rule.condition.threshold;
  }
}

export function getUnlockedThemeIds(state: UnlockState): ThemeId[] {
  // Classic is always unlocked.
  const unlocked: ThemeId[] = ['classic'];
  for (const rule of UNLOCK_RULES) {
    if (rule.target.kind === 'theme' && isUnlocked(rule, state)) {
      unlocked.push(rule.target.id);
    }
  }
  return unlocked;
}

export function getUnlockedDifficultyIds(state: UnlockState): DifficultyId[] {
  // Chill + Classic are always unlocked.
  const unlocked: DifficultyId[] = ['chill', 'classic'];
  for (const rule of UNLOCK_RULES) {
    if (rule.target.kind === 'difficulty' && isUnlocked(rule, state)) {
      unlocked.push(rule.target.id);
    }
  }
  return unlocked;
}

/**
 * Returns rules that became unlocked given the new state but were NOT already
 * in the seenUnlocks list. Used by the GameOver flow to surface toasts.
 */
export function findNewlyUnlocked(
  state: UnlockState,
  seenUnlockIds: string[]
): UnlockRule[] {
  const seen = new Set(seenUnlockIds);
  return UNLOCK_RULES.filter((r) => isUnlocked(r, state) && !seen.has(r.id));
}
