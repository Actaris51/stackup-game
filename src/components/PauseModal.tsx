// Pause overlay shown when the player taps the pause button mid-game. The
// RAF loop is paused upstream (useGameEngine.pauseLoop) so the moving block
// freezes — this is purely the UI surface. Choosing "Quitter" aborts the
// run without persisting any partial stats; "Reprendre" calls resumeLoop.

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, type Theme } from '../constants';

interface PauseModalProps {
  visible: boolean;
  theme: Theme;
  onResume: () => void;
  onQuit: () => void;
}

export function PauseModal({ visible, theme, onResume, onQuit }: PauseModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: shiftLuminance(theme.background, 0.14),
              borderColor: 'rgba(255,255,255,0.18)',
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>Pause</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            La partie est mise en attente.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={onResume}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: COLORS.buttonText }]}>
              Reprendre
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.textSecondary }]}
            onPress={onQuit}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
              Quitter la partie
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Local copy of the helper used in GameOverModal — kept inline to avoid an
// extra module just for two callers. If a third caller appears, hoist this.
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
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
