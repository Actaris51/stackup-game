import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
} from 'react-native';
import { COLORS, type Difficulty, type Theme } from '../constants';

interface GameOverModalProps {
  visible: boolean;
  score: number;
  /** Best score for the current difficulty mode (already persisted by GameScreen). */
  modeBest: number;
  /** True if `score` beat the previous per-mode best. */
  isNewRecord: boolean;
  difficulty: Difficulty;
  theme: Theme;
  hasContinued: boolean;
  onRestart: () => void;
  onContinue: () => void;
}

export function GameOverModal({
  visible,
  score,
  modeBest,
  isNewRecord,
  difficulty,
  theme,
  hasContinued,
  onRestart,
  onContinue,
}: GameOverModalProps) {
  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scored ${score} on StackUp (${difficulty.nameEN} mode)! Can you beat me? 🏗️`,
      });
    } catch {}
  };

  // Theme-driven dynamic styles.
  const cardBg = mixOpacity(theme.background, 0.95);
  const borderCol = withAlpha(theme.text, 0.1);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          {isNewRecord && (
            <Text style={[styles.newRecord, { color: theme.perfect }]}>NEW RECORD!</Text>
          )}

          <Text style={[styles.title, { color: theme.text }]}>Game Over</Text>

          <View style={[styles.modeChip, { borderColor: theme.accent }]}>
            <Text style={[styles.modeChipText, { color: theme.accent }]}>
              {difficulty.nameEN.toUpperCase()}
            </Text>
          </View>

          <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Score</Text>
          <Text style={[styles.score, { color: theme.text }]}>{score}</Text>

          <Text style={[styles.modeBestLabel, { color: theme.textSecondary }]}>
            Best ({difficulty.nameEN}): {modeBest}
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={onRestart}
          >
            <Text style={[styles.buttonText, { color: COLORS.buttonText }]}>Play Again</Text>
          </TouchableOpacity>

          {!hasContinued && (
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={onContinue}
            >
              <Text style={[styles.buttonText, { color: COLORS.buttonText }]}>
                Continue (Ad)
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={[styles.shareText, { color: theme.textSecondary }]}>Share Score</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// --- helpers ---

/** Adds an opacity to a hex colour (best-effort; falls back to the input). */
function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** Slight desaturation/lightening trick: blend the theme bg with itself for a card feel. */
function mixOpacity(hex: string, _factor: number): string {
  // For now we just return the bg as-is — the borderColor + slight inset is enough.
  return hex;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
  },
  newRecord: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 12,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  modeChipText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scoreLabel: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  score: {
    fontSize: 64,
    fontWeight: '900',
    marginBottom: 8,
  },
  modeBestLabel: {
    fontSize: 14,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#4ECDC4',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
  },
  shareButton: {
    paddingVertical: 12,
    marginTop: 4,
  },
  shareText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
