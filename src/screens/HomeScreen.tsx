import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Application from 'expo-application';
import { COLORS, type Difficulty, type Theme } from '../constants';
import { getDailyChallengeStatus, getHighScoreForMode } from '../utils/storage';
import {
  isGameCenterAvailable,
  showGameCenter,
  showLeaderboard,
  LEADERBOARDS,
} from '../utils/gameCenter';
import { getDailyChallenge } from '../utils/dailyChallenge';
import { ThemedBackground } from '../components/ThemedBackground';

interface HomeScreenProps {
  theme: Theme;
  difficulty: Difficulty;
  /** Streak count from App.tsx (0 means "no streak yet today"). */
  dailyStreak: number;
  onPlay: () => void;
  /** Launch today's Daily Challenge run. */
  onPlayDaily: () => void;
  onCustomize: () => void;
}

interface DailyCardState {
  playedToday: boolean;
  todayScore: number;
  label: string;
}

export function HomeScreen({
  theme,
  difficulty,
  dailyStreak,
  onPlay,
  onPlayDaily,
  onCustomize,
}: HomeScreenProps) {
  const [modeBest, setModeBest] = useState(0);
  const [showGameCenterButton, setShowGameCenterButton] = useState(false);
  // null until loaded — the card doesn't render before that (no flicker).
  const [daily, setDaily] = useState<DailyCardState | null>(null);

  useEffect(() => {
    getHighScoreForMode(difficulty.id).then(setModeBest).catch(() => {});
    setShowGameCenterButton(isGameCenterAvailable());
  }, [difficulty.id]);

  // Daily challenge card state. HomeScreen unmounts while playing, so this
  // re-runs (and refreshes the played/score state) every time we come back.
  useEffect(() => {
    (async () => {
      try {
        const status = await getDailyChallengeStatus();
        const { label } = getDailyChallenge();
        setDaily({ ...status, label });
      } catch {
        setDaily(null);
      }
    })();
  }, []);

  // Expo bakes the version from app.json into Application.nativeApplicationVersion
  // on native, and falls back to the JS-known version otherwise.
  const appVersion =
    Application.nativeApplicationVersion ?? '1.1.4';

  return (
    <ThemedBackground theme={theme} style={styles.container}>
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
          it doubles as an at-a-glance status indicator. Made it visually
          distinct (solid accent bg + white text) so it's clearly interactive. */}
      <TouchableOpacity
        onPress={onCustomize}
        activeOpacity={0.7}
        style={[styles.modeChip, { backgroundColor: theme.accent }]}
        hitSlop={8}
      >
        <Text style={[styles.modeChipLabel, { color: '#fff' }]}>
          ⚙️ MODE
        </Text>
        <Text style={[styles.modeChipValue, { color: '#fff' }]}>
          {difficulty.name.toUpperCase()}
        </Text>
        <Text style={[styles.modeChipChevron, { color: '#fff' }]}>›</Text>
      </TouchableOpacity>
      <Text style={[styles.modeHint, { color: theme.textSecondary }]}>
        Appuie pour changer de mode et de thème
      </Text>

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

      {/* Daily challenge card — one seeded attempt/day, feeds the recurring
          Game Center "Daily Best" leaderboard. After playing, the card flips
          to today's score and (when GC is available) opens the leaderboard. */}
      {daily && (
        <TouchableOpacity
          style={[styles.dailyCard, { borderColor: theme.accent }]}
          onPress={
            daily.playedToday
              ? () => {
                  if (isGameCenterAvailable()) {
                    showLeaderboard(LEADERBOARDS.DAILY_BEST);
                  }
                }
              : onPlayDaily
          }
          activeOpacity={0.8}
        >
          <View style={styles.dailyHeaderRow}>
            <Text style={[styles.dailyTitle, { color: theme.text }]}>
              🗓️ DÉFI DU JOUR
            </Text>
            <Text style={[styles.dailyLabel, { color: theme.accent }]}>
              {daily.label}
            </Text>
          </View>
          <Text style={[styles.dailyStatus, { color: theme.textSecondary }]}>
            {daily.playedToday
              ? `✓ Fait : ${daily.todayScore} pts${
                  showGameCenterButton ? ' — voir le classement ›' : ''
                }`
              : 'Un seul essai par jour. À toi de jouer ›'}
          </Text>
        </TouchableOpacity>
      )}

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
    </ThemedBackground>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 8,
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
  modeChipChevron: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 2,
    marginTop: -2,
  },
  modeHint: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 24,
    opacity: 0.8,
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
  dailyCard: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  dailyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dailyTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  dailyLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  dailyStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  bottomActions: {
    marginTop: 22,
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
