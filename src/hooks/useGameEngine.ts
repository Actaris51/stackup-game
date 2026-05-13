import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_THEME_ID,
  GAME,
  getBlockColor,
  getBlockColorFromTheme,
  getDifficulty,
  getTheme,
  type Difficulty,
  type Theme,
} from '../constants';

export type GameState = 'idle' | 'playing' | 'gameOver';

export interface StackedBlock {
  x: number;
  width: number;
  color: string;
}

export interface CutPiece {
  x: number;
  width: number;
  color: string;
  side: 'left' | 'right';
}

export interface GameData {
  state: GameState;
  score: number;
  perfectStreak: number;
  /** Highest perfectStreak reached during this game (for achievements). */
  maxPerfectStreak: number;
  /** Total blocks added during this game (for cumulative leaderboard). */
  blocksPlacedThisGame: number;
  stackedBlocks: StackedBlock[];
  movingBlock: { x: number; width: number; color: string; direction: 1 | -1 };
  speed: number;
  isPerfect: boolean;
  lastCutPiece: CutPiece | null;
  lastScoreGain: number;
}

export interface UseGameEngineOptions {
  difficulty?: Difficulty;
  theme?: Theme;
}

export function useGameEngine(opts?: UseGameEngineOptions) {
  // Resolve effective difficulty + theme (defaults preserve v1.0 behaviour).
  const difficulty = opts?.difficulty ?? getDifficulty(DEFAULT_DIFFICULTY_ID);
  const theme = opts?.theme ?? getTheme(DEFAULT_THEME_ID);

  // Store live params in refs so the inner setGameData callbacks always see
  // the current values without forcing the engine to re-create on each prop
  // change. (We snapshot at startGame() time anyway.)
  const difficultyRef = useRef<Difficulty>(difficulty);
  const themeRef = useRef<Theme>(theme);
  difficultyRef.current = difficulty;
  themeRef.current = theme;

  const [gameData, setGameData] = useState<GameData>(() => createInitialState(difficulty, theme));
  const animFrameRef = useRef<number | null>(null);
  const gameDataRef = useRef<GameData>(gameData);
  gameDataRef.current = gameData;
  /**
   * Source of truth for whether the RAF loop should keep scheduling.
   * Decoupled from React state so the loop can exit synchronously without
   * waiting for a state update to propagate. Flipped to true by startGame /
   * continueGame, to false by every codepath that ends or pauses the game.
   */
  const isLoopRunningRef = useRef(false);

  // Keep idle state in sync with the picked theme/difficulty so the home
  // screen / preview reflects the selection without requiring a tap.
  useEffect(() => {
    setGameData((prev) => {
      if (prev.state !== 'idle') return prev; // never tweak an in-progress game
      return createInitialState(difficulty, theme);
    });
  }, [difficulty.id, theme.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount — without this, a partial RAF chain leaks if the user
  // navigates away mid-game (e.g. tapping the Menu button on Game Over while
  // continueGame() is queued, or any future deep-link navigation).
  useEffect(() => {
    return () => {
      isLoopRunningRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  const gameLoop = useCallback(() => {
    // Exit early if any caller flipped the flag (gameOver, reset, unmount).
    // This is the only check that breaks the RAF chain — the previous code
    // unconditionally scheduled the next frame, which kept the loop alive
    // long after game over and bled battery on long sessions.
    if (!isLoopRunningRef.current) {
      animFrameRef.current = null;
      return;
    }

    setGameData((prev) => {
      if (prev.state !== 'playing') return prev;

      const { movingBlock } = prev;
      let newX = movingBlock.x + prev.speed * movingBlock.direction;
      let newDirection = movingBlock.direction;

      // Bounce off edges
      if (newX + movingBlock.width > GAME.SCREEN_WIDTH) {
        newX = GAME.SCREEN_WIDTH - movingBlock.width;
        newDirection = -1;
      } else if (newX < 0) {
        newX = 0;
        newDirection = 1;
      }

      return {
        ...prev,
        movingBlock: { ...movingBlock, x: newX, direction: newDirection as 1 | -1 },
        isPerfect: false,
      };
    });

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const startGame = useCallback(() => {
    const initial = createInitialState(difficultyRef.current, themeRef.current);
    initial.state = 'playing';
    setGameData(initial);
    isLoopRunningRef.current = true;
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  /**
   * Pause/resume the RAF loop without changing the public game state. The
   * UI shows "playing" but the moving block freezes. Used by the pause
   * overlay so callers, e.g. a phone call interruption, don't auto-lose.
   */
  const pauseLoop = useCallback(() => {
    isLoopRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const resumeLoop = useCallback(() => {
    if (isLoopRunningRef.current) return; // already running
    if (gameDataRef.current.state !== 'playing') return;
    isLoopRunningRef.current = true;
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const tap = useCallback(() => {
    setGameData((prev) => {
      if (prev.state !== 'playing') return prev;

      const diff = difficultyRef.current;
      const thm = themeRef.current;

      const topBlock = prev.stackedBlocks[prev.stackedBlocks.length - 1];
      const moving = prev.movingBlock;

      // Calculate overlap
      const overlapStart = Math.max(topBlock.x, moving.x);
      const overlapEnd = Math.min(topBlock.x + topBlock.width, moving.x + moving.width);
      const overlapWidth = overlapEnd - overlapStart;

      // Miss (no overlap)
      if (overlapWidth <= 0) {
        if (!diff.canGameOver) {
          // Zen mode: ignore the bad tap, keep playing.
          return prev;
        }
        isLoopRunningRef.current = false;
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        return { ...prev, state: 'gameOver' as GameState, lastCutPiece: null, lastScoreGain: 0 };
      }

      // Check if perfect
      const offset = Math.abs(topBlock.x - moving.x);
      const isPerfect = offset <= diff.perfectTolerance;

      let newBlock: StackedBlock;
      let newWidth: number;
      let cutPiece: CutPiece | null = null;

      if (isPerfect) {
        newBlock = { x: topBlock.x, width: topBlock.width, color: moving.color };
        newWidth = topBlock.width;
      } else {
        newBlock = { x: overlapStart, width: overlapWidth, color: moving.color };
        newWidth = overlapWidth;

        // Calculate the cut piece for falling animation
        if (moving.x < topBlock.x) {
          // Overhang on the left
          cutPiece = { x: moving.x, width: topBlock.x - moving.x, color: moving.color, side: 'left' };
        } else {
          // Overhang on the right
          const cutX = overlapEnd;
          cutPiece = { x: cutX, width: moving.x + moving.width - cutX, color: moving.color, side: 'right' };
        }
      }

      // Game over if block too small (Zen mode clamps to MIN instead).
      if (newWidth < GAME.MIN_BLOCK_WIDTH) {
        if (!diff.canGameOver) {
          newWidth = GAME.MIN_BLOCK_WIDTH;
          newBlock = { ...newBlock, width: newWidth };
        } else {
          isLoopRunningRef.current = false;
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
          }
          return { ...prev, state: 'gameOver' as GameState, lastCutPiece: null, lastScoreGain: 0 };
        }
      }

      const newPerfectStreak = isPerfect ? prev.perfectStreak + 1 : 0;
      const newMaxPerfectStreak = Math.max(prev.maxPerfectStreak, newPerfectStreak);
      const scoreBonus = isPerfect ? 3 + newPerfectStreak : 1;
      const newScore = prev.score + scoreBonus;
      // Colour cycles on the cumulative block counter (monotonic) so that
      // capping stackedBlocks below doesn't make the palette restart visually
      // in long Zen runs.
      const nextColourIndex = prev.blocksPlacedThisGame + 2;
      const newSpeed = computeSpeed(diff, prev.blocksPlacedThisGame);

      // Bound the stack history. Render already uses VISIBLE_STACK_COUNT and
      // gameplay only needs the topmost block — anything older is dead
      // memory. Without this cap, Zen mode allocates O(n²) over a long run
      // (each tap rebuilds an ever-larger array) and noticeably stutters
      // past a few thousand blocks. STACK_HISTORY_CAP > VISIBLE_STACK_COUNT
      // so render stays seamless across the truncation seam.
      const STACK_HISTORY_CAP = 50;
      const appended = [...prev.stackedBlocks, newBlock];
      const trimmedStack =
        appended.length > STACK_HISTORY_CAP
          ? appended.slice(appended.length - STACK_HISTORY_CAP)
          : appended;

      return {
        ...prev,
        score: newScore,
        perfectStreak: newPerfectStreak,
        maxPerfectStreak: newMaxPerfectStreak,
        blocksPlacedThisGame: prev.blocksPlacedThisGame + 1,
        isPerfect,
        lastCutPiece: cutPiece,
        lastScoreGain: scoreBonus,
        stackedBlocks: trimmedStack,
        movingBlock: {
          x: 0,
          width: newWidth,
          color: getBlockColorFromTheme(thm, nextColourIndex),
          direction: 1 as const,
        },
        speed: newSpeed,
      };
    });
  }, []);

  const reset = useCallback(() => {
    isLoopRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setGameData(createInitialState(difficultyRef.current, themeRef.current));
  }, []);

  const continueGame = useCallback(() => {
    setGameData((prev) => {
      if (prev.state !== 'gameOver') return prev;
      const thm = themeRef.current;
      const topBlock = prev.stackedBlocks[prev.stackedBlocks.length - 1];
      return {
        ...prev,
        state: 'playing' as GameState,
        movingBlock: {
          x: 0,
          width: Math.max(topBlock.width, GAME.INITIAL_BLOCK_WIDTH * 0.3),
          color: getBlockColorFromTheme(thm, prev.blocksPlacedThisGame + 1),
          direction: 1 as const,
        },
      };
    });
    isLoopRunningRef.current = true;
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  return { gameData, startGame, tap, reset, continueGame, pauseLoop, resumeLoop };
}

// --- helpers ---

function initialBlockWidth(diff: Difficulty): number {
  return GAME.INITIAL_BLOCK_WIDTH * diff.initialBlockWidthMul;
}

function computeSpeed(diff: Difficulty, stackLength: number): number {
  const initial = GAME.INITIAL_SPEED * diff.initialSpeedMul;
  const incr = GAME.SPEED_INCREMENT * diff.speedIncrementMul;
  const max = GAME.MAX_SPEED * diff.maxSpeedMul;
  return Math.min(max, initial + stackLength * incr);
}

function createInitialState(diff: Difficulty, thm: Theme): GameData {
  const baseWidth = initialBlockWidth(diff);
  const firstBlock: StackedBlock = {
    x: (GAME.SCREEN_WIDTH - baseWidth) / 2,
    width: baseWidth,
    color: getBlockColorFromTheme(thm, 0),
  };
  return {
    state: 'idle',
    score: 0,
    perfectStreak: 0,
    maxPerfectStreak: 0,
    blocksPlacedThisGame: 0,
    stackedBlocks: [firstBlock],
    movingBlock: {
      x: 0,
      width: baseWidth,
      color: getBlockColorFromTheme(thm, 1),
      direction: 1,
    },
    speed: GAME.INITIAL_SPEED * diff.initialSpeedMul,
    isPerfect: false,
    lastCutPiece: null,
    lastScoreGain: 0,
  };
}

// Re-exported for convenience: the legacy getBlockColor still works for any
// caller that doesn't care about themes.
export { getBlockColor };
