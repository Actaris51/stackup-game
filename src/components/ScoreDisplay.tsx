import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants';

interface ScoreDisplayProps {
  score: number;
  isPerfect: boolean;
  perfectStreak: number;
}

export function ScoreDisplay({ score, isPerfect, perfectStreak }: ScoreDisplayProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPerfect) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [score, isPerfect]);

  return (
    <>
      <Animated.Text
        style={[
          styles.score,
          { transform: [{ scale: scaleAnim }] },
          isPerfect && styles.perfect,
        ]}
      >
        {score}
      </Animated.Text>
      {isPerfect && (
        <Text style={styles.perfectText}>
          PERFECT!{perfectStreak > 1 ? ` x${perfectStreak}` : ''}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  score: {
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  perfect: {
    color: COLORS.perfect,
  },
  perfectText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.perfect,
    textAlign: 'center',
    marginTop: -5,
    letterSpacing: 4,
  },
});
