// Floating toast that announces newly unlocked content (themes / modes) at
// game over. Cycles through multiple unlocks one at a time.
//
// Renders absolutely positioned at the top of the GameScreen, ABOVE the
// GameOverModal (the modal uses RN Modal which is rendered outside the React
// tree, so a sibling sits visually above only because of its zIndex / order
// in the layout — we render this AFTER the modal and on iOS its absolute
// position with high zIndex handles it cleanly).

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  DIFFICULTIES,
  THEMES,
  type Theme,
  type UnlockRule,
} from '../constants';

interface UnlockToastProps {
  unlocks: UnlockRule[];
  theme: Theme;
  /** Called once the user has dismissed (or auto-cycled past) all unlocks. */
  onDismiss: () => void;
}

const TOAST_DURATION_MS = 3200;

export function UnlockToast({ unlocks, theme, onDismiss }: UnlockToastProps) {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (index >= unlocks.length) {
      onDismiss();
      return;
    }
    // Fade in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      // Fade out then move to next
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -30,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIndex((i) => i + 1);
      });
    }, TOAST_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, unlocks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (index >= unlocks.length) return null;
  const current = unlocks[index];
  const { title, subtitle, icon } = describeUnlock(current);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: -30,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start(() => setIndex((i) => i + 1));
        }}
        style={[
          styles.toast,
          { backgroundColor: theme.accent, shadowColor: theme.accent },
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function describeUnlock(rule: UnlockRule): {
  title: string;
  subtitle: string;
  icon: string;
} {
  if (rule.target.kind === 'theme') {
    const t = THEMES[rule.target.id];
    return {
      title: 'Nouveau thème débloqué !',
      subtitle: t.name,
      icon: '🎨',
    };
  }
  const d = DIFFICULTIES[rule.target.id];
  return {
    title: 'Nouveau mode débloqué !',
    subtitle: d.name,
    icon: rule.target.id === 'zen' ? '🧘' : '⚡',
  };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 240,
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  textBlock: {
    flexShrink: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
});
