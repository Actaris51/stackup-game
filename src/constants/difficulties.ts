// Difficulty modes — gameplay-affecting parameters.
// Each mode multiplies against the GAME baseline in constants/index.ts.
//
// Highscores are tracked per mode (see utils/storage.ts and utils/gameCenter.ts).
// Zen is special: no game over, no leaderboard — purely relaxing infinite stack.

export type DifficultyId = 'chill' | 'classic' | 'hard' | 'insane' | 'zen';

export interface Difficulty {
  id: DifficultyId;
  name: string;
  nameEN: string;
  /** Initial speed multiplier vs GAME.INITIAL_SPEED (Classic = 1.0). */
  initialSpeedMul: number;
  /** Cap multiplier vs GAME.MAX_SPEED. */
  maxSpeedMul: number;
  /** Per-block speed-up multiplier vs GAME.SPEED_INCREMENT. */
  speedIncrementMul: number;
  /** Initial block width multiplier vs GAME.INITIAL_BLOCK_WIDTH. */
  initialBlockWidthMul: number;
  /** Pixel tolerance for "perfect" placement (lower = stricter). */
  perfectTolerance: number;
  /** True if scores in this mode submit to a Game Center leaderboard. */
  hasLeaderboard: boolean;
  /** False = Zen-style infinite mode, never triggers game over. */
  canGameOver: boolean;
  description: string;
  descriptionEN: string;
}

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  chill: {
    id: 'chill',
    name: 'Détente',
    nameEN: 'Chill',
    initialSpeedMul: 0.7,
    maxSpeedMul: 0.85,
    speedIncrementMul: 0.6,
    initialBlockWidthMul: 1.15,
    perfectTolerance: 8,
    hasLeaderboard: false,
    canGameOver: true,
    description: 'Vitesse réduite, blocs plus larges. Idéal pour débuter.',
    descriptionEN: 'Slower pace, wider blocks. Perfect for beginners.',
  },
  classic: {
    id: 'classic',
    name: 'Classique',
    nameEN: 'Classic',
    initialSpeedMul: 1.0,
    maxSpeedMul: 1.0,
    speedIncrementMul: 1.0,
    initialBlockWidthMul: 1.0,
    perfectTolerance: 5,
    hasLeaderboard: true,
    canGameOver: true,
    description: 'Le mode original. Compatible avec le classement principal.',
    descriptionEN: 'The original. Submits to the main leaderboard.',
  },
  hard: {
    id: 'hard',
    name: 'Difficile',
    nameEN: 'Hard',
    initialSpeedMul: 1.3,
    maxSpeedMul: 1.4,
    speedIncrementMul: 1.3,
    initialBlockWidthMul: 0.85,
    perfectTolerance: 4,
    hasLeaderboard: true,
    canGameOver: true,
    description: 'Plus rapide, blocs plus étroits. Score séparé.',
    descriptionEN: 'Faster, narrower blocks. Separate leaderboard.',
  },
  insane: {
    id: 'insane',
    name: 'Insensé',
    nameEN: 'Insane',
    initialSpeedMul: 1.6,
    maxSpeedMul: 1.7,
    speedIncrementMul: 1.5,
    initialBlockWidthMul: 0.75,
    perfectTolerance: 3,
    hasLeaderboard: true,
    canGameOver: true,
    description: 'Pour les experts. Score séparé.',
    descriptionEN: 'Expert tier. Separate leaderboard.',
  },
  zen: {
    id: 'zen',
    name: 'Zen',
    nameEN: 'Zen',
    initialSpeedMul: 0.9,
    maxSpeedMul: 1.0,
    speedIncrementMul: 0.8,
    initialBlockWidthMul: 1.0,
    perfectTolerance: 5,
    hasLeaderboard: false,
    canGameOver: false,
    description: 'Sans game over. Empile sans pression.',
    descriptionEN: 'No game over. Stack without pressure.',
  },
};

export const DEFAULT_DIFFICULTY_ID: DifficultyId = 'classic';

/** UI display order from easiest to hardest, with Zen last. */
export const DIFFICULTY_ORDER: DifficultyId[] = [
  'chill',
  'classic',
  'hard',
  'insane',
  'zen',
];

export function getDifficulty(id: DifficultyId): Difficulty {
  return DIFFICULTIES[id] ?? DIFFICULTIES[DEFAULT_DIFFICULTY_ID];
}
