// First-launch tutorial. Three-step swipe-through overlay shown above the
// HomeScreen on the very first launch (gated by storage.isOnboardingSeen).
// Tapping the primary CTA on the last step persists the seen flag via
// onDone() — App.tsx then unmounts this overlay.

import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, type Theme } from '../constants';

interface OnboardingStep {
  emoji: string;
  title: string;
  body: string;
}

const STEPS: OnboardingStep[] = [
  {
    emoji: '👆',
    title: 'Tape pour empiler',
    body: 'Une touche pose le bloc en mouvement. La largeur restante devient le prochain bloc.',
  },
  {
    emoji: '✨',
    title: 'Vise le PERFECT',
    body: 'Aligne pile-poil — le bloc garde sa pleine largeur et tu gagnes un bonus. Les combos rapportent gros.',
  },
  {
    emoji: '🏆',
    title: 'Débloque thèmes & modes',
    body: 'Augmente ton score et le nombre de blocs cumulés pour débloquer 6 nouveaux thèmes et 3 modes de difficulté.',
  },
];

interface OnboardingOverlayProps {
  theme: Theme;
  onDone: () => void;
}

export function OnboardingOverlay({ theme, onDone }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (step >= STEPS.length - 1) {
      onDone();
      return;
    }
    Animated.sequence([
      Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    // Increment after the fade-out so the swap is invisible.
    setTimeout(() => setStep((s) => s + 1), 120);
  };

  const handleSkip = () => onDone();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Modal transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: theme.background }]}>
        {/* Skip — small, top-right, only shown if not on the last step */}
        {!isLast && (
          <TouchableOpacity
            style={styles.skip}
            onPress={handleSkip}
            hitSlop={16}
          >
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>
              Passer
            </Text>
          </TouchableOpacity>
        )}

        <Animated.View style={[styles.content, { opacity }]}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{current.title}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {current.body}
          </Text>
        </Animated.View>

        {/* Dot pagination */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === step ? theme.accent : theme.textSecondary,
                  opacity: i === step ? 1 : 0.35,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.accent }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaText, { color: COLORS.buttonText }]}>
            {isLast ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skip: {
    position: 'absolute',
    top: 60,
    right: 22,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 10,
    maxWidth: 340,
  },
  emoji: {
    fontSize: 88,
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 44,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cta: {
    paddingHorizontal: 56,
    paddingVertical: 16,
    borderRadius: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
