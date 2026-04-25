import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Platform,
} from 'react-native';
import { COLORS } from '../constants';
import { getHighScore, setHighScore } from '../utils/storage';

interface GameOverModalProps {
  visible: boolean;
  score: number;
  onRestart: () => void;
  onContinue: () => void;
  hasContinued: boolean;
}

export function GameOverModal({
  visible,
  score,
  onRestart,
  onContinue,
  hasContinued,
}: GameOverModalProps) {
  const [highScore, setHigh] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    if (visible) {
      getHighScore().then((hs) => {
        if (score > hs) {
          setHighScore(score);
          setHigh(score);
          setIsNewRecord(true);
        } else {
          setHigh(hs);
          setIsNewRecord(false);
        }
      });
    }
  }, [visible, score]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scored ${score} on StackUp! Can you beat me? 🏗️`,
      });
    } catch {}
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {isNewRecord && <Text style={styles.newRecord}>NEW RECORD!</Text>}

          <Text style={styles.title}>Game Over</Text>

          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.score}>{score}</Text>

          <Text style={styles.highScoreLabel}>Best: {highScore}</Text>

          <TouchableOpacity style={styles.button} onPress={onRestart}>
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>

          {!hasContinued && (
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={onContinue}
            >
              <Text style={styles.buttonText}>Continue (Ad)</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareText}>Share Score</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1e1e3a',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  newRecord: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.perfect,
    letterSpacing: 3,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  score: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },
  highScoreLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.button,
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
    color: COLORS.buttonText,
    fontSize: 18,
    fontWeight: '800',
  },
  shareButton: {
    paddingVertical: 12,
    marginTop: 4,
  },
  shareText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
