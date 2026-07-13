import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import type { Theme } from '../constants';

interface RecordIndicatorProps {
  /** The pre-game best score for the current mode. */
  record: number;
  /** True once the live score has passed the record. */
  beaten: boolean;
  theme: Theme;
}

/**
 * Small pill under the score that surfaces the player's record while they
 * approach it, then flips to a gold "RECORD BATTU !" the moment they pass it.
 * GameScreen only mounts this when the score is close (≥70% of the record),
 * so the fade-in doubles as the "you're getting close" cue.
 */
export function RecordIndicator({ record, beaten, theme }: RecordIndicatorProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Celebratory pop when the record is crossed.
  useEffect(() => {
    if (!beaten) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.2, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [beaten]);

  const color = beaten ? theme.perfect : theme.textSecondary;

  return (
    <Animated.View
      style={[
        styles.pill,
        { borderColor: color, opacity, transform: [{ scale }] },
      ]}
    >
      <Text style={[styles.text, { color }]}>
        {beaten ? '👑 RECORD BATTU !' : `👑 Record : ${record}`}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
