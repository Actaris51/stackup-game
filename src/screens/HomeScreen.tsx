import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, type Difficulty, type Theme } from '../constants';
import { getHighScoreForMode } from '../utils/storage';
import { isGameCenterAvailable, showGameCenter } from '../utils/gameCenter';

interface HomeScreenProps {
  theme: Theme;
  difficulty: Difficulty;
  onPlay: () => void;
  onCustomize: () => void;
}

export function HomeScreen({
  theme,
  difficulty,
  onPlay,
  onCustomize,
}: HomeScreenProps) {
  const [modeBest, setModeBest] = useState(0);
  const [showGameCenterButton, setShowGameCenterButton] = useState(false);

  useEffect(() => {
    getHighScoreForMode(difficulty.id).then(setModeBest).catch(() => {});
    setShowGameCenterButton(isGameCenterAvailable());
  }, [difficulty.id]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]}>STACK</Text>
        <Text style={[styles.titleAccent, { color: theme.accent }]}>UP</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Tap to stack. Don't miss.
      </Text>

      {/* Active mode chip — small but visible above the PLAY button */}
      <TouchableOpacity
        onPress={onCustomize}
        activeOpacity={0.7}
        style={[styles.modeChip, { borderColor: theme.accent }]}
      >
        <Text style={[styles.modeChipLabel, { color: theme.textSecondary }]}>
          MODE
        </Text>
        <Text style={[styles.modeChipValue, { color: theme.accent }]}>
          {difficulty.name.toUpperCase()}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.playButton,
          { backgroundColor: theme.accent, shadowColor: theme.accent },
        ]}
        onPress={onPlay}
        activeOpacity={0.8}
      >
        <Text style={[styles.playText, { color: COLORS.buttonText }]}>PLAY</Text>
      </TouchableOpacity>

      {modeBest > 0 && (
        <View style={styles.highScoreContainer}>
          <Text style={[styles.highScoreLabel, { color: theme.textSecondary }]}>
            BEST ({difficulty.nameEN.toUpperCase()})
          </Text>
          <Text style={[styles.highScoreValue, { color: theme.text }]}>
            {modeBest}
          </Text>
        </View>
      )}

      <View style={styles.bottomActions}>
        <TouchableOpacity
          onPress={onCustomize}
          activeOpacity={0.7}
          style={[styles.secondaryButton, { borderColor: theme.textSecondary }]}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
            🎨 PERSONNALISER
          </Text>
        </TouchableOpacity>

        {showGameCenterButton && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.textSecondary }]}
            onPress={() => {
              showGameCenter();
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
              🏆 CLASSEMENTS
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  title: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 8,
  },
  titleAccent: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    letterSpacing: 2,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 28,
  },
  modeChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  modeChipValue: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  playButton: {
    paddingHorizontal: 60,
    paddingVertical: 20,
    borderRadius: 40,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  playText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 6,
  },
  highScoreContainer: {
    marginTop: 36,
    alignItems: 'center',
  },
  highScoreLabel: {
    fontSize: 12,
    letterSpacing: 3,
  },
  highScoreValue: {
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
  },
  bottomActions: {
    marginTop: 40,
    gap: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
