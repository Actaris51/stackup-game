import { useCallback, useRef, useState } from 'react';
import { GAME, getBlockColor } from '../constants';

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
  stackedBlocks: StackedBlock[];
  movingBlock: { x: number; width: number; color: string; direction: 1 | -1 };
  speed: number;
  isPerfect: boolean;
  lastCutPiece: CutPiece | null;
  lastScoreGain: number;
}

export function useGameEngine() {
  const [gameData, setGameData] = useState<GameData>(createInitialState());
  const animFrameRef = useRef<number | null>(null);
  const gameDataRef = useRef<GameData>(gameData);
  gameDataRef.current = gameData;

  function createInitialState(): GameData {
    const firstBlock: StackedBlock = {
      x: (GAME.SCREEN_WIDTH - GAME.INITIAL_BLOCK_WIDTH) / 2,
      width: GAME.INITIAL_BLOCK_WIDTH,
      color: getBlockColor(0),
    };
    return {
      state: 'idle',
      score: 0,
      perfectStreak: 0,
      stackedBlocks: [firstBlock],
      movingBlock: {
        x: 0,
        width: GAME.INITIAL_BLOCK_WIDTH,
        color: getBlockColor(1),
        direction: 1,
      },
      speed: GAME.INITIAL_SPEED,
      isPerfect: false,
      lastCutPiece: null,
      lastScoreGain: 0,
    };
  }

  const gameLoop = useCallback(() => {
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
    const initial = createInitialState();
    initial.state = 'playing';
    setGameData(initial);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const tap = useCallback(() => {
    setGameData((prev) => {
      if (prev.state !== 'playing') return prev;

      const topBlock = prev.stackedBlocks[prev.stackedBlocks.length - 1];
      const moving = prev.movingBlock;

      // Calculate overlap
      const overlapStart = Math.max(topBlock.x, moving.x);
      const overlapEnd = Math.min(topBlock.x + topBlock.width, moving.x + moving.width);
      const overlapWidth = overlapEnd - overlapStart;

      // Miss — game over
      if (overlapWidth <= 0) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        return { ...prev, state: 'gameOver' as GameState, lastCutPiece: null, lastScoreGain: 0 };
      }

      // Check if perfect
      const offset = Math.abs(topBlock.x - moving.x);
      const isPerfect = offset <= GAME.PERFECT_TOLERANCE;

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

      // Game over if block too small
      if (newWidth < GAME.MIN_BLOCK_WIDTH) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        return { ...prev, state: 'gameOver' as GameState, lastCutPiece: null, lastScoreGain: 0 };
      }

      const newPerfectStreak = isPerfect ? prev.perfectStreak + 1 : 0;
      const scoreBonus = isPerfect ? 3 + newPerfectStreak : 1;
      const newScore = prev.score + scoreBonus;
      const blockIndex = prev.stackedBlocks.length + 1;
      const newSpeed = Math.min(
        GAME.MAX_SPEED,
        GAME.INITIAL_SPEED + prev.stackedBlocks.length * GAME.SPEED_INCREMENT
      );

      return {
        ...prev,
        score: newScore,
        perfectStreak: newPerfectStreak,
        isPerfect,
        lastCutPiece: cutPiece,
        lastScoreGain: scoreBonus,
        stackedBlocks: [...prev.stackedBlocks, newBlock],
        movingBlock: {
          x: 0,
          width: newWidth,
          color: getBlockColor(blockIndex),
          direction: 1 as const,
        },
        speed: newSpeed,
      };
    });
  }, []);

  const reset = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setGameData(createInitialState());
  }, []);

  const continueGame = useCallback(() => {
    setGameData((prev) => {
      if (prev.state !== 'gameOver') return prev;
      const topBlock = prev.stackedBlocks[prev.stackedBlocks.length - 1];
      return {
        ...prev,
        state: 'playing' as GameState,
        movingBlock: {
          x: 0,
          width: Math.max(topBlock.width, GAME.INITIAL_BLOCK_WIDTH * 0.3),
          color: getBlockColor(prev.stackedBlocks.length),
          direction: 1 as const,
        },
      };
    });
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  return { gameData, startGame, tap, reset, continueGame };
}
