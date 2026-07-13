import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  COLORS,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  THEMES,
  THEME_ORDER,
  UNLOCK_RULES,
  type Difficulty,
  type DifficultyId,
  type Theme,
  type ThemeId,
} from '../constants';
import {
  addAdUnlock,
  getAdUnlocks,
  getCompetitiveBestScore,
  getGamesPlayed,
  getTotalBlocks,
  markUnlocksSeen,
} from '../utils/storage';
import { getUnlockedDifficultyIds, getUnlockedThemeIds } from '../constants';
import { showRewarded } from '../utils/ads';

interface CustomizeScreenProps {
  theme: Theme;
  difficulty: Difficulty;
  onChangeTheme: (id: ThemeId) => void;
  onChangeDifficulty: (id: DifficultyId) => void;
  onBack: () => void;
  /** Optional jump-into-game CTA on the selected difficulty row. */
  onPlay?: () => void;
}

interface ProgressState {
  bestScore: number;
  totalBlocks: number;
  gamesPlayed: number;
}

export function CustomizeScreen({
  theme,
  difficulty,
  onChangeTheme,
  onChangeDifficulty,
  onBack,
  onPlay,
}: CustomizeScreenProps) {
  const [unlockedThemes, setUnlockedThemes] = useState<Set<ThemeId>>(
    new Set(['classic'])
  );
  const [unlockedDifficulties, setUnlockedDifficulties] = useState<
    Set<DifficultyId>
  >(new Set(['chill', 'classic']));
  const [progress, setProgress] = useState<ProgressState>({
    bestScore: 0,
    totalBlocks: 0,
    gamesPlayed: 0,
  });
  // Theme currently being unlocked via rewarded ad (blocks concurrent taps).
  const [unlockingThemeId, setUnlockingThemeId] = useState<ThemeId | null>(null);

  useEffect(() => {
    (async () => {
      const [bestScore, totalBlocks, gamesPlayed, adUnlocks] = await Promise.all([
        getCompetitiveBestScore(),
        getTotalBlocks(),
        getGamesPlayed(),
        getAdUnlocks(),
      ]);
      const state = { bestScore, totalBlocks, gamesPlayed };
      setProgress(state);
      // Themes: milestone-based unlocks ∪ ad-granted unlocks.
      const themeIds = new Set(getUnlockedThemeIds(state));
      for (const uid of adUnlocks) {
        if (uid.startsWith('theme:')) {
          themeIds.add(uid.slice('theme:'.length) as ThemeId);
        }
      }
      setUnlockedThemes(themeIds);
      setUnlockedDifficulties(new Set(getUnlockedDifficultyIds(state)));
    })();
  }, []);

  // Rewarded "unlock now" for cosmetic themes only — difficulty modes stay
  // milestone-gated so progression keeps its meaning. On success the theme is
  // persisted as unlocked, marked seen (no redundant toast when the milestone
  // is later reached naturally), and activated immediately.
  const handleAdUnlockTheme = useCallback(
    async (id: ThemeId) => {
      if (unlockingThemeId) return;
      setUnlockingThemeId(id);
      try {
        const watched = await showRewarded();
        if (watched) {
          const unlockId = `theme:${id}`;
          await addAdUnlock(unlockId);
          await markUnlocksSeen([unlockId]);
          setUnlockedThemes((prev) => new Set([...prev, id]));
          onChangeTheme(id);
        }
      } catch (e) {
        console.log('[Customize] ad unlock failed (non-fatal)', e);
      } finally {
        setUnlockingThemeId(null);
      }
    },
    [unlockingThemeId, onChangeTheme]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={16}>
          <Text style={[styles.backText, { color: theme.text }]}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Personnaliser
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* THEMES SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          THÈMES
        </Text>
        <View style={styles.themeGrid}>
          {THEME_ORDER.map((id) => {
            const t = THEMES[id];
            const unlocked = unlockedThemes.has(id);
            const selected = theme.id === id;
            return (
              <ThemeCard
                key={id}
                theme={t}
                selected={selected}
                unlocked={unlocked}
                unlockHint={getUnlockHint('theme', id, progress)}
                accent={theme.accent}
                textColor={theme.text}
                textSecondary={theme.textSecondary}
                onPress={() => unlocked && onChangeTheme(id)}
                onAdUnlock={() => handleAdUnlockTheme(id)}
                adUnlockBusy={unlockingThemeId === id}
                adUnlockDisabled={unlockingThemeId !== null}
              />
            );
          })}
        </View>

        {/* DIFFICULTY SECTION */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.textSecondary, marginTop: 32 },
          ]}
        >
          DIFFICULTÉ
        </Text>
        <View style={styles.difficultyList}>
          {DIFFICULTY_ORDER.map((id) => {
            const d = DIFFICULTIES[id];
            const unlocked = unlockedDifficulties.has(id);
            const selected = difficulty.id === id;
            return (
              <DifficultyRow
                key={id}
                difficulty={d}
                selected={selected}
                unlocked={unlocked}
                unlockHint={getUnlockHint('difficulty', id, progress)}
                accent={theme.accent}
                textColor={theme.text}
                textSecondary={theme.textSecondary}
                onPress={() => unlocked && onChangeDifficulty(id)}
                onPlay={selected && onPlay ? onPlay : undefined}
              />
            );
          })}
        </View>

        <Text style={[styles.footnote, { color: theme.textSecondary }]}>
          {Platform.OS === 'ios'
            ? 'Les achievements Game Center se débloquent en parallèle.'
            : 'Empile pour débloquer plus de thèmes et de modes.'}
        </Text>
      </ScrollView>
    </View>
  );
}

// ---------- ThemeCard ----------

interface ThemeCardProps {
  theme: Theme;
  selected: boolean;
  unlocked: boolean;
  unlockHint?: string;
  accent: string;
  textColor: string;
  textSecondary: string;
  onPress: () => void;
  /** Rewarded-ad shortcut: unlock this theme right now by watching an ad. */
  onAdUnlock?: () => void;
  /** True while THIS card's rewarded ad is loading/showing. */
  adUnlockBusy?: boolean;
  /** True while ANY card's rewarded ad is in flight (blocks concurrent taps). */
  adUnlockDisabled?: boolean;
}

function ThemeCard({
  theme,
  selected,
  unlocked,
  unlockHint,
  accent,
  textColor,
  textSecondary,
  onPress,
  onAdUnlock,
  adUnlockBusy,
  adUnlockDisabled,
}: ThemeCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={unlocked ? 0.7 : 1}
      style={[
        styles.themeCard,
        {
          backgroundColor: theme.background,
          borderColor: selected ? accent : 'rgba(255,255,255,0.08)',
          borderWidth: selected ? 2 : 1,
          opacity: unlocked ? 1 : 0.55,
        },
      ]}
      onPress={onPress}
    >
      {/* Mini-stack preview */}
      <View style={styles.previewStack}>
        {theme.blockPalette.slice(0, 5).map((c, i) => (
          <View
            key={i}
            style={[
              styles.previewBlock,
              {
                backgroundColor: c,
                width: 50 - i * 4,
              },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.themeName, { color: textColor }]}>{theme.name}</Text>

      {!unlocked && unlockHint && (
        <Text style={[styles.themeLock, { color: textSecondary }]} numberOfLines={2}>
          🔒 {unlockHint}
        </Text>
      )}
      {!unlocked && onAdUnlock && (
        <TouchableOpacity
          onPress={onAdUnlock}
          disabled={adUnlockDisabled}
          activeOpacity={0.7}
          style={[styles.adUnlockButton, { borderColor: accent }]}
          hitSlop={6}
        >
          <Text style={[styles.adUnlockText, { color: accent }]}>
            {adUnlockBusy ? '⏳ Pub en cours…' : '🎬 Pub pour débloquer'}
          </Text>
        </TouchableOpacity>
      )}
      {selected && (
        <View style={[styles.selectedBadge, { backgroundColor: accent }]}>
          <Text style={styles.selectedBadgeText}>ACTIF</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------- DifficultyRow ----------

interface DifficultyRowProps {
  difficulty: Difficulty;
  selected: boolean;
  unlocked: boolean;
  unlockHint?: string;
  accent: string;
  textColor: string;
  textSecondary: string;
  onPress: () => void;
  /** When provided AND this row is selected, render a ▶ shortcut that
   *  jumps straight into a game with the chosen mode. */
  onPlay?: () => void;
}

function DifficultyRow({
  difficulty,
  selected,
  unlocked,
  unlockHint,
  accent,
  textColor,
  textSecondary,
  onPress,
  onPlay,
}: DifficultyRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={unlocked ? 0.7 : 1}
      onPress={onPress}
      style={[
        styles.difficultyRow,
        {
          borderColor: selected ? accent : 'rgba(255,255,255,0.08)',
          borderWidth: selected ? 2 : 1,
          opacity: unlocked ? 1 : 0.55,
          flexDirection: 'row',
          alignItems: 'center',
        },
      ]}
    >
      <View style={styles.difficultyTextWrap}>
        <View style={styles.difficultyHeader}>
          <Text style={[styles.difficultyName, { color: textColor }]}>
            {difficulty.name}
          </Text>
          {selected && (
            <View style={[styles.selectedPill, { backgroundColor: accent }]}>
              <Text style={styles.selectedPillText}>ACTIF</Text>
            </View>
          )}
          {!unlocked && (
            <Text style={[styles.lockIcon, { color: textSecondary }]}>🔒</Text>
          )}
        </View>
        <Text
          style={[styles.difficultyDescription, { color: textSecondary }]}
          numberOfLines={2}
        >
          {difficulty.description}
        </Text>
        {!unlocked && unlockHint && (
          <Text style={[styles.difficultyHint, { color: textSecondary }]}>
            {unlockHint}
          </Text>
        )}
      </View>
      {onPlay && (
        <TouchableOpacity
          onPress={onPlay}
          activeOpacity={0.7}
          style={[styles.playShortcut, { backgroundColor: accent }]}
          hitSlop={10}
        >
          <Text style={[styles.playShortcutText, { color: COLORS.buttonText }]}>
            ▶
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ---------- helper: human-readable unlock hint ----------

/**
 * Returns a human-readable unlock hint, suffixed with the player's current
 * progress towards the threshold. Without the current value the hint just
 * states the target — adding "(actuel : X)" turns the screen into a real
 * progress dashboard and gives the player a concrete next step.
 */
function getUnlockHint(
  kind: 'theme' | 'difficulty',
  id: string,
  progress?: ProgressState
): string | undefined {
  const rule = UNLOCK_RULES.find(
    (r) => r.target.kind === kind && r.target.id === (id as any)
  );
  if (!rule) return undefined;
  const { metric, threshold } = rule.condition;
  const currentValue = progress
    ? metric === 'bestScore'
      ? progress.bestScore
      : metric === 'totalBlocks'
      ? progress.totalBlocks
      : progress.gamesPlayed
    : undefined;
  const suffix =
    currentValue !== undefined ? ` — actuel : ${currentValue}` : '';
  switch (metric) {
    case 'bestScore':
      return `Score ${threshold} en mode compétitif${suffix}`;
    case 'totalBlocks':
      return `Empile ${threshold} blocs au total${suffix}`;
    case 'gamesPlayed':
      return `Joue ${threshold} parties${suffix}`;
  }
}

const CARD_WIDTH = 150;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    minWidth: 80,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 12,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  themeCard: {
    width: CARD_WIDTH,
    minHeight: 180,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  previewStack: {
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 60,
    justifyContent: 'flex-end',
  },
  previewBlock: {
    height: 8,
    marginBottom: 2,
    borderRadius: 2,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  themeLock: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
  },
  adUnlockButton: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  adUnlockText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedBadgeText: {
    color: COLORS.buttonText,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  difficultyList: {
    gap: 10,
  },
  difficultyRow: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  difficultyTextWrap: {
    flex: 1,
  },
  difficultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  difficultyName: {
    fontSize: 17,
    fontWeight: '800',
  },
  selectedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedPillText: {
    color: COLORS.buttonText,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  lockIcon: {
    fontSize: 14,
    marginLeft: 'auto',
  },
  difficultyDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  difficultyHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 6,
  },
  playShortcut: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  playShortcutText: {
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 2, // optical centring for the triangle glyph
  },
  footnote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
});
