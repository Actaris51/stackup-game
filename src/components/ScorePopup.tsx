import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { COLORS } from '../constants';

interface ScorePopupProps {
  text: string;
  x: number;
  y: number;
  isPerfect: boolean;
  onDone: () => void;
}

export function ScorePopup({ text, x, y, isPerfect, onDone }: ScorePopupProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(scale, {
          toValue: isPerfect ? 1.4 : 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 700,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start(onDone);
  }, []);

  return (
    <Animated.Text
      style={[
        styles.popup,
        isPerfect && styles.perfect,
        {
          left: x - 40,
          top: y - 20,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    width: 80,
    zIndex: 25,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  perfect: {
    fontSize: 26,
    color: COLORS.perfect,
    width: 120,
    left: -60,
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowRadius: 8,
  },
});
