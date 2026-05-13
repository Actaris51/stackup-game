import React, { ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
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
  /** Cumulative stats shown below the score for engagement context. Optional —
   *  the modal degrades gracefully if any field is missing (e.g. before the
   *  post-game async chain has resolved). */
  cumulativeStats?: {
    gamesPlayed?: number;
    totalBlocks?: number;
    maxPerfectStreak?: number;
  };
  /** Optional slot rendered above the action buttons. Used to host the
   *  UnlockToast inside the modal so it sits ABOVE the dark overlay (a
   *  sibling toast at top:70 with zIndex is masked by the modal on most
   *  RN platforms — the Modal renders in its own native window). */
  banner?: ReactNode;
  onRestart: () => void;
  onContinue: () => void;
  /** Return to the home screen (for changing mode / theme via Customize). */
  onHome: () => void;
}

export function GameOverModal({
  visible,
  score,
  modeBest,
  isNewRecord,
  difficulty,
  theme,
  hasContinued,
  cumulativeStats,
  banner,
  onRestart,
  onContinue,
  onHome,
}: GameOverModalProps) {
  const handleShare = async () => {
    try {
      await Share.share({
        message: `J'ai fait ${score} sur StackUp (mode ${difficulty.name}). Tu peux faire mieux ?`,
      });
    } catch {}
  };

  // Theme-driven dynamic styles. The card uses a lifted background derived
  // from the theme so it actually reads as a card on every theme — the old
  // mixOpacity stub returned the screen bg unchanged, making the card
  // disappear into the screen on Galaxy/Forest themes.
  const cardBg = shiftLuminance(theme.background, 0.14);
  const borderCol = withAlpha(theme.text, 0.18);

  // Score reveal — counts up from 0 to the final score over ~600ms.
  // Resets each time the modal becomes visible. useNativeDriver:false so
  // we can read the numeric value into a Text node via listener.
  const reveal = useRef(new Animated.Value(0)).current;
  const [displayedScore, setDisplayedScore] = React.useState(0);
  useEffect(() => {
    if (!visible) {
      reveal.setValue(0);
      setDisplayedScore(0);
      return;
    }
    const listener = reveal.addListener(({ value }) => {
      setDisplayedScore(Math.round(value));
    });
    Animated.timing(reveal, {
      toValue: score,
      duration: Math.min(900, 300 + score * 12),
      useNativeDriver: false,
    }).start();
    return () => reveal.removeListener(listener);
  }, [visible, score]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          {/* Slot for unlock toast / record banner — sits at the top of the
              card, above the score, INSIDE the modal so it actually shows. */}
          {banner ? <View style={styles.bannerSlot}>{banner}</View> : null}

          {isNewRecord && (
            <Text style={[styles.newRecord, { color: theme.perfect }]}>
              NOUVEAU RECORD !
            </Text>
          )}

          <Text style={[styles.title, { color: theme.text }]}>Game Over</Text>

          <View style={[styles.modeChip, { borderColor: theme.accent }]}>
            <Text style={[styles.modeChipText, { color: theme.accent }]}>
              {difficulty.name.toUpperCase()}
            </Text>
          </View>

          <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Score</Text>
          <Text style={[styles.score, { color: theme.text }]}>{displayedScore}</Text>

          <Text style={[styles.modeBestLabel, { color: theme.textSecondary }]}>
            Meilleur ({difficulty.name}) : {modeBest}
          </Text>

          {cumulativeStats && (
            <View style={styles.statsRow}>
              {cumulativeStats.gamesPlayed != null && (
                <StatPill
                  label="Parties"
                  value={String(cumulativeStats.gamesPlayed)}
                  color={theme.textSecondary}
                />
              )}
              {cumulativeStats.totalBlocks != null && (
                <StatPill
                  label="Blocs"
                  value={formatCount(cumulativeStats.totalBlocks)}
                  color={theme.textSecondary}
                />
              )}
              {cumulativeStats.maxPerfectStreak != null &&
                cumulativeStats.maxPerfectStreak > 0 && (
                  <StatPill
                    label="Combo"
                    value={String(cumulativeStats.maxPerfectStreak)}
                    color={theme.textSecondary}
                  />
                )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={onRestart}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: COLORS.buttonText }]}>
              Rejouer
            </Text>
          </TouchableOpacity>

          {!hasContinued && (
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: shiftLuminance(theme.accent, 0.18),
                  borderColor: theme.accent,
                  borderWidth: 1,
                },
              ]}
              onPress={onContinue}
              activeOpacity={0.85}
            >
              <Text style={[styles.buttonText, { color: COLORS.buttonText }]}>
                Continuer (pub)
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={onHome}
              hitSlop={8}
            >
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                🏠 Menu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleShare}
              hitSlop={8}
            >
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                Partager
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- helpers ---

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillLabel, { color }]}>{label}</Text>
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
    </View>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

/** Adds an opacity to a hex colour (best-effort; falls back to the input). */
function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/**
 * Shift a #RRGGBB colour towards white (positive amount) or black (negative).
 * Used to lift the modal card off the screen background on every theme. We
 * stay in sRGB space — perceptual accuracy isn't required for a card lift.
 */
function shiftLuminance(hex: string, amount: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const mix = (c: number) =>
    amount >= 0 ? clamp(c + (255 - c) * amount) : clamp(c * (1 + amount));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
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
    width: '85%',
    maxWidth: 360,
    borderWidth: 1,
  },
  bannerSlot: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
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
    minHeight: 70, // reserve space so the count-up animation doesn't jitter layout
  },
  modeBestLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    minWidth: 56,
  },
  statPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statPillValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 8,
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
