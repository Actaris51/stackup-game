import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  StatusBar,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameEngine } from '../hooks/useGameEngine';
import type { CutPiece } from '../hooks/useGameEngine';
import { Block } from '../components/Block';
import { Stack } from '../components/Stack';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { GameOverModal } from '../components/GameOverModal';
import { FallingPiece } from '../components/FallingPiece';
import { PerfectEffect } from '../components/PerfectEffect';
import { ScorePopup } from '../components/ScorePopup';
import { TapToStart } from '../components/TapToStart';
import { COLORS, GAME } from '../constants';
import { showInterstitial, showRewarded, AD_CONFIG } from '../utils/ads';
import { incrementGamesPlayed } from '../utils/storage';
import {
  playPlaceSound,
  playPerfectSound,
  playComboSound,
  playGameOverSound,
} from '../utils/sounds';

interface GameScreenProps {
  onHome: () => void;
}

interface FallingPieceData extends CutPiece {
  id: number;
  y: number;
}

interface ScorePopupData {
  id: number;
  text: string;
  x: number;
  y: number;
  isPerfect: boolean;
}

interface PerfectEffectData {
  id: number;
  x: number;
  y: number;
  width: number;
  streak: number;
}

let effectIdCounter = 0;

export function GameScreen({ onHome }: GameScreenProps) {
  const { gameData, startGame, tap, reset, continueGame } = useGameEngine();
  const [hasContinued, setHasContinued] = useState(false);
  const [started, setStarted] = useState(false);

  // Effects state
  const [fallingPieces, setFallingPieces] = useState<FallingPieceData[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopupData[]>([]);
  const [perfectEffects, setPerfectEffects] = useState<PerfectEffectData[]>([]);

  // Screen shake
  const shakeX = useRef(new Animated.Value(0)).current;
  const prevStateRef = useRef(gameData.state);
  const prevScoreRef = useRef(gameData.score);

  // Detect game over for shake + sound
  useEffect(() => {
    if (prevStateRef.current === 'playing' && gameData.state === 'gameOver') {
      playGameOverSound();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      // Screen shake
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
    prevStateRef.current = gameData.state;
  }, [gameData.state]);

  // Detect score change for effects
  useEffect(() => {
    if (gameData.score > prevScoreRef.current && gameData.state === 'playing') {
      const blockCount = gameData.stackedBlocks.length;
      const blockY =
        GAME.STACK_AREA_HEIGHT - blockCount * GAME.BLOCK_HEIGHT;
      const topBlock = gameData.stackedBlocks[blockCount - 1];

      if (gameData.isPerfect) {
        playPerfectSound();
        if (gameData.perfectStreak > 1) {
          playComboSound(gameData.perfectStreak);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Perfect particles
        const id = ++effectIdCounter;
        setPerfectEffects((prev) => [
          ...prev,
          { id, x: topBlock.x, y: blockY, width: topBlock.width, streak: gameData.perfectStreak },
        ]);
      } else {
        playPlaceSound();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      // Score popup
      const popupId = ++effectIdCounter;
      const popupText = gameData.isPerfect
        ? gameData.perfectStreak > 1
          ? `PERFECT x${gameData.perfectStreak}!`
          : 'PERFECT!'
        : `+${gameData.lastScoreGain}`;

      setScorePopups((prev) => [
        ...prev,
        {
          id: popupId,
          text: popupText,
          x: topBlock.x + topBlock.width / 2,
          y: blockY,
          isPerfect: gameData.isPerfect,
        },
      ]);

      // Falling cut piece
      if (gameData.lastCutPiece) {
        const pieceId = ++effectIdCounter;
        setFallingPieces((prev) => [
          ...prev,
          { ...gameData.lastCutPiece!, id: pieceId, y: blockY },
        ]);
      }
    }
    prevScoreRef.current = gameData.score;
  }, [gameData.score, gameData.state]);

  const handleTap = useCallback(() => {
    if (!started) {
      startGame();
      setStarted(true);
      setHasContinued(false);
      return;
    }
    if (gameData.state === 'playing') {
      tap();
    }
  }, [started, gameData.state, startGame, tap]);

  const handleRestart = useCallback(async () => {
    const gamesPlayed = await incrementGamesPlayed();
    if (gamesPlayed % AD_CONFIG.INTERSTITIAL_FREQUENCY === 0) {
      await showInterstitial();
    }
    setFallingPieces([]);
    setScorePopups([]);
    setPerfectEffects([]);
    reset();
    setStarted(false);
    setHasContinued(false);
  }, [reset]);

  const handleContinue = useCallback(async () => {
    const watched = await showRewarded();
    if (watched) {
      setHasContinued(true);
      continueGame();
    }
  }, [continueGame]);

  const removeFallingPiece = useCallback((id: number) => {
    setFallingPieces((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const removeScorePopup = useCallback((id: number) => {
    setScorePopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const removePerfectEffect = useCallback((id: number) => {
    setPerfectEffects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const movingBlockY =
    GAME.STACK_AREA_HEIGHT -
    gameData.stackedBlocks.length * GAME.BLOCK_HEIGHT -
    GAME.BLOCK_HEIGHT;

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <Animated.View style={[styles.container, { transform: [{ translateX: shakeX }] }]}>
        <StatusBar barStyle="light-content" />

        {/* Score */}
        <View style={styles.scoreContainer}>
          <ScoreDisplay
            score={gameData.score}
            isPerfect={gameData.isPerfect}
            perfectStreak={gameData.perfectStreak}
          />
        </View>

        {/* Game area */}
        <View style={styles.gameArea}>
          <Stack blocks={gameData.stackedBlocks} />

          {/* Moving block */}
          {gameData.state === 'playing' && (
            <View style={[styles.movingBlockContainer, { top: movingBlockY }]}>
              <Block
                x={gameData.movingBlock.x}
                width={gameData.movingBlock.width}
                color={gameData.movingBlock.color}
                isMoving
              />
            </View>
          )}

          {/* Falling pieces */}
          {fallingPieces.map((piece) => (
            <FallingPiece
              key={piece.id}
              x={piece.x}
              width={piece.width}
              y={piece.y}
              color={piece.color}
              side={piece.side}
              onDone={() => removeFallingPiece(piece.id)}
            />
          ))}

          {/* Score popups */}
          {scorePopups.map((popup) => (
            <ScorePopup
              key={popup.id}
              text={popup.text}
              x={popup.x}
              y={popup.y}
              isPerfect={popup.isPerfect}
              onDone={() => removeScorePopup(popup.id)}
            />
          ))}

          {/* Perfect effects */}
          {perfectEffects.map((effect) => (
            <PerfectEffect
              key={effect.id}
              x={effect.x}
              y={effect.y}
              width={effect.width}
              streak={effect.streak}
              onDone={() => removePerfectEffect(effect.id)}
            />
          ))}

          {/* Tap to start */}
          {!started && gameData.state === 'idle' && (
            <View style={styles.tapToStart}>
              <TapToStart />
            </View>
          )}
        </View>

        {/* Game Over */}
        <GameOverModal
          visible={gameData.state === 'gameOver'}
          score={gameData.score}
          onRestart={handleRestart}
          onContinue={handleContinue}
          hasContinued={hasContinued}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scoreContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  gameArea: {
    flex: 1,
  },
  movingBlockContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: GAME.BLOCK_HEIGHT,
  },
  tapToStart: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
