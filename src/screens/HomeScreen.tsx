import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Application from 'expo-application';
import { COLORS, type Difficulty, type Theme } from '../constants';
import { getHighScoreForMode } from '../utils/storage';
import { isGameCenterAvailable, showGameCenter } from '../utils/gameCenter';

interface HomeScreenProps {
  theme: Theme;
  difficulty: Difficulty;
  /** Streak count from App.tsx (0 means "no streak yet today"). */
  dailyStreak: number;
  onPlay: () => void;
  onCustomize: () => void;
}

export function HomeScreen({
  theme,
  difficulty,
  dailyStreak,
  onPlay,
  onCustomize,
}: HomeScreenProps) {
  const [modeBest, setModeBest] = useState(0);
  const [showGameCenterButton, setShowGameCenterButton] = useState(false);

  useEffect(() => {
    getHighScoreForMode(difficulty.id).then(setModeBest).catch(() => {});
    setShowGameCenterButton(isGameCenterAvailable());
  }, [difficulty.id]);

  // Expo bakes the version from app.json into Application.nativeApplicationVersion
  // on native, and falls back to the JS-known version otherwise.
  const appVersion =
    Application.nativeApplicationVersion ?? '1.1.2';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]}>STACK</Text>
        <Text style={[styles.titleAccent, { color: theme.accent }]}>UP</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Tape, empile, vise juste.
      </Text>

      {/* Active mode chip — single source of access to Customize. The old
          layout had this chip *and* a redundant secondary button at the
          bottom; both routed to the same screen. Kept the chip because
          it doubles as an at-a-glance status indicator. */}
      <TouchableOpacity
        onPress={onCustomize}
        activeOpacity={0.7}
        style={[styles.modeChip, { borderColor: theme.accent }]}
        hitSlop={6}
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

      {/* Best-score block reserves its own height so the PLAY button doesn't
          jump when this view appears on first record. */}
      <View style={styles.highScoreContainer}>
        {modeBest > 0 ? (
          <>
            <Text style={[styles.highScoreLabel, { color: theme.textSecondary }]}>
              MEILLEUR ({difficulty.name.toUpperCase()})
            </Text>
            <Text style={[styles.highScoreValue, { color: theme.text }]}>
              {modeBest}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.bottomActions}>
        {dailyStreak > 1 && (
          // Show the streak only when it's worth bragging about — a fresh
          // streak of 1 isn't a habit yet, just a single play.
          <View style={[styles.streakPill, { borderColor: theme.accent }]}>
            <Text style={[styles.streakEmoji]}>🔥</Text>
            <Text style={[styles.streakText, { color: theme.text }]}>
              {dailyStreak} jours de suite
            </Text>
          </View>
        )}

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

      {/* Version footer — tiny, useful for testers reporting bugs ("I'm on
          v1.1.2 build X and …"). */}
      <Text style={[styles.versionText, { color: theme.textSecondary }]}>
        v{appVersion}
      </Text>
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
    // Reserved height so the PLAY button doesn't jump up by 60px when the
    // user beats their first score. (label 12px line + 36px score + 4 spacing
    // ≈ 60. Constant matches actual rendered height to avoid Cumulative
    // Layout Shift on second app launch when modeBest flips from 0 → N.)
    minHeight: 60,
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
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
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
  versionText: {
    position: 'absolute',
    bottom: 20,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    opacity: 0.55,
  },
});
