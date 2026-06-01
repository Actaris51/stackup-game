import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { UnlockToast } from '../components/UnlockToast';
import { PauseModal } from '../components/PauseModal';
import { ThemedBackground } from '../components/ThemedBackground';
import {
  GAME,
  findNewlyUnlocked,
  type Difficulty,
  type Theme,
  type UnlockRule,
} from '../constants';
import { showInterstitial, showRewarded, AD_CONFIG } from '../utils/ads';
import {
  addBlocksToTotal,
  getCompetitiveBestScore,
  getGamesPlayed,
  getHighScoreForMode,
  getMaxPerfectStreak,
  getSeenUnlocks,
  getTotalBlocks,
  incrementGamesPlayed,
  markUnlocksSeen,
  setHighScoreForMode,
  updateMaxPerfectStreak,
} from '../utils/storage';
import { processAchievements, submitGameOverScores } from '../utils/gameCenter';
import {
  playPlaceSound,
  playPerfectSound,
  playComboSound,
  playGameOverSound,
} from '../utils/sounds';

interface GameScreenProps {
  onHome: () => void;
  theme: Theme;
  difficulty: Difficulty;
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

export function GameScreen({ onHome, theme, difficulty }: GameScreenProps) {
  const { gameData, startGame, tap, reset, continueGame, pauseLoop, resumeLoop } =
    useGameEngine({ difficulty, theme });
  const [hasContinued, setHasContinued] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  // Game-over context passed to the modal (filled by the post-game async flow).
  const [modeBest, setModeBest] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<UnlockRule[]>([]);
  // Cumulative-stats snapshot shown in the modal after game over.
  const [cumulativeStats, setCumulativeStats] = useState<{
    gamesPlayed?: number;
    totalBlocks?: number;
    maxPerfectStreak?: number;
  } | null>(null);

  // Effects state
  const [fallingPieces, setFallingPieces] = useState<FallingPieceData[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopupData[]>([]);
  const [perfectEffects, setPerfectEffects] = useState<PerfectEffectData[]>([]);

  // Screen shake
  const shakeX = useRef(new Animated.Value(0)).current;
  const prevStateRef = useRef(gameData.state);
  const prevScoreRef = useRef(gameData.score);

  // Detect game over for shake + sound + Game Center submission + unlocks
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

      const finalScore = gameData.score;
      const blocksPlaced = gameData.blocksPlacedThisGame;
      const maxStreakInGame = gameData.maxPerfectStreak;
      const modeId = difficulty.id;

      (async () => {
        try {
          // Persist stats
          const gamesPlayed = await incrementGamesPlayed();
          const totalBlocks = await addBlocksToTotal(blocksPlaced);
          const maxPerfectStreak = await updateMaxPerfectStreak(maxStreakInGame);

          // Surface cumulative stats in the game-over modal for engagement.
          setCumulativeStats({ gamesPlayed, totalBlocks, maxPerfectStreak });

          // Per-mode high score
          const { beatModeRecord } = await setHighScoreForMode(modeId, finalScore);
          const modeBestNow = await getHighScoreForMode(modeId);
          setModeBest(modeBestNow);
          setIsNewRecord(beatModeRecord);

          // Game Center submissions + achievements run in parallel — each call
          // bridges to native, and a sequential await chain visibly stalled
          // the modal reveal by 200-500 ms on long-play sessions.
          await Promise.all([
            submitGameOverScores({
              finalScore,
              totalBlocks,
              difficulty: modeId,
            }),
            processAchievements({
              finalScore,
              maxPerfectStreakInGame: maxStreakInGame,
              gamesPlayed,
              totalBlocks,
              difficulty: modeId,
            }),
          ]);

          // Unlocks (use competitive best, not chill/zen)
          const competitiveBest = await getCompetitiveBestScore();
          const seen = await getSeenUnlocks();
          const newly = findNewlyUnlocked(
            { bestScore: competitiveBest, totalBlocks, gamesPlayed },
            seen
          );
          if (newly.length > 0) {
            setNewlyUnlocked(newly);
            await markUnlocksSeen(newly.map((r) => r.id));
          } else {
            setNewlyUnlocked([]);
          }
        } catch (e) {
          console.log('[GameOver] post-game stats failed', e);
        }
      })();
    }
    prevStateRef.current = gameData.state;
  }, [gameData.state]);

  // Detect score change for effects
  useEffect(() => {
    if (gameData.score > prevScoreRef.current && gameData.state === 'playing') {
      const blockCount = gameData.stackedBlocks.length;
      // Visible stack tops out at VISIBLE_STACK_COUNT — beyond that the
      // rendered stack appears at the same y while the logical count keeps
      // climbing. Clamp the popup/falling-piece anchor so effects stay
      // pinned to the actual on-screen top block in long runs (Zen mode
      // especially).
      const visibleStackHeight =
        Math.min(blockCount, GAME.VISIBLE_STACK_COUNT) * GAME.BLOCK_HEIGHT;
      const blockY = GAME.STACK_AREA_HEIGHT - visibleStackHeight;
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

  // Reset displayed mode best whenever a fresh game starts (cleaner UX).
  useEffect(() => {
    if (gameData.state === 'idle') {
      // Best-effort initial value so the modal next time isn't empty.
      getHighScoreForMode(difficulty.id).then(setModeBest).catch(() => {});
    }
  }, [difficulty.id, gameData.state]);

  const handleTap = useCallback(() => {
    if (paused) return; // ignore taps while the pause overlay is up
    if (!started) {
      startGame();
      setStarted(true);
      setHasContinued(false);
      setNewlyUnlocked([]);
      setIsNewRecord(false);
      setCumulativeStats(null);
      return;
    }
    if (gameData.state === 'playing') {
      tap();
    }
  }, [paused, started, gameData.state, startGame, tap]);

  const handleRestart = useCallback(() => {
    // Reset the game IMMEDIATELY and synchronously. The restart must NEVER be
    // gated on the interstitial's lifecycle.
    //
    // v1.1.4 bug: this used to `await showInterstitial()` BEFORE reset(). With
    // real (non-test) interstitials, the `CLOSED` event can be slow or — in some
    // mediation paths — never reach JS, so the awaited promise didn't resolve and
    // reset() never ran. The player was left frozen on Game Over after dismissing
    // the ad ("une pub s'affiche, puis bloqué après"). Test ads masked this
    // because they closed cleanly. Decoupling the reset from the ad fixes it for
    // good — even if the ad hangs or throws, the game is already playable again.
    //
    // Note: incrementGamesPlayed + Game Center submission already happened in the
    // game-over useEffect above.
    const wasContinued = hasContinued;
    setFallingPieces([]);
    setScorePopups([]);
    setPerfectEffects([]);
    setNewlyUnlocked([]);
    setIsNewRecord(false);
    setCumulativeStats(null);
    reset();
    setStarted(false);
    setHasContinued(false);

    // Show the interstitial on cadence WITHOUT blocking the restart. Suppress it
    // right after a rewarded "Continue" so the player never gets two ads back to
    // back (rewarded → die → restart → interstitial feels punishing). Fire-and-
    // forget: any failure is non-fatal and can no longer freeze the game.
    if (!wasContinued) {
      (async () => {
        try {
          const gamesPlayed = await getGamesPlayed();
          if (gamesPlayed % AD_CONFIG.INTERSTITIAL_FREQUENCY === 0) {
            await showInterstitial();
          }
        } catch (e) {
          console.log('[GameOver] interstitial failed (non-fatal)', e);
        }
      })();
    }
  }, [reset, hasContinued]);

  // --- Pause handlers ---
  const openPause = useCallback(() => {
    if (gameData.state !== 'playing' || paused) return;
    setPaused(true);
    pauseLoop();
  }, [gameData.state, paused, pauseLoop]);

  const resumeFromPause = useCallback(() => {
    setPaused(false);
    resumeLoop();
  }, [resumeLoop]);

  const quitFromPause = useCallback(() => {
    setPaused(false);
    // Don't persist any partial stats — quitting from pause is an abort,
    // not a game over. Just unwind to home.
    reset();
    setStarted(false);
    setHasContinued(false);
    setCumulativeStats(null);
    onHome();
  }, [reset, onHome]);

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

  const handleUnlockToastDismiss = useCallback(() => {
    setNewlyUnlocked([]);
  }, []);

  // Once the stack passes VISIBLE_STACK_COUNT, the rendered tower stops
  // growing visually (Stack.tsx only renders the last N blocks). The moving
  // block must clamp to that ceiling, otherwise it floats off-screen as the
  // logical count keeps climbing — fatal in Zen mode.
  const visibleBlocks = Math.min(
    gameData.stackedBlocks.length,
    GAME.VISIBLE_STACK_COUNT
  );
  const movingBlockY =
    GAME.STACK_AREA_HEIGHT - visibleBlocks * GAME.BLOCK_HEIGHT - GAME.BLOCK_HEIGHT;

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <Animated.View
        style={[styles.container, { transform: [{ translateX: shakeX }] }]}
      >
        {/* Ambient themed background sits behind everything. It rides the
            shake transform with the rest of the screen, which actually
            adds to the game-over impact. */}
        <ThemedBackground theme={theme} style={StyleSheet.absoluteFill} />

        <StatusBar barStyle="light-content" />

        {/* Score */}
        <View style={styles.scoreContainer} pointerEvents="box-none">
          <ScoreDisplay
            score={gameData.score}
            isPerfect={gameData.isPerfect}
            perfectStreak={gameData.perfectStreak}
          />
        </View>

        {/* Pause button — only meaningful during an active game, hidden on
            idle (TapToStart already covers the screen) and on game over. */}
        {gameData.state === 'playing' && !paused && (
          <TouchableOpacity
            onPress={openPause}
            style={styles.pauseButton}
            hitSlop={16}
            activeOpacity={0.7}
          >
            <Text style={[styles.pauseGlyph, { color: theme.textSecondary }]}>
              ⏸
            </Text>
          </TouchableOpacity>
        )}

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
          modeBest={modeBest}
          isNewRecord={isNewRecord}
          difficulty={difficulty}
          theme={theme}
          onRestart={handleRestart}
          onContinue={handleContinue}
          hasContinued={hasContinued}
          onHome={onHome}
          cumulativeStats={cumulativeStats ?? undefined}
          banner={
            newlyUnlocked.length > 0 ? (
              <UnlockToast
                unlocks={newlyUnlocked}
                theme={theme}
                onDismiss={handleUnlockToastDismiss}
              />
            ) : null
          }
        />

        {/* Pause overlay. Independent Modal so it can sit above gameplay. */}
        <PauseModal
          visible={paused}
          theme={theme}
          onResume={resumeFromPause}
          onQuit={quitFromPause}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scoreContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  pauseButton: {
    position: 'absolute',
    top: 56,
    right: 22,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    zIndex: 15,
  },
  pauseGlyph: {
    fontSize: 18,
    fontWeight: '700',
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
