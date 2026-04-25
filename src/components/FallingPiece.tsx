import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { GAME } from '../constants';

interface FallingPieceProps {
  x: number;
  width: number;
  y: number;
  color: string;
  side: 'left' | 'right';
  onDone: () => void;
}

export function FallingPiece({ x, width, y, color, side, onDone }: FallingPieceProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: GAME.SCREEN_HEIGHT,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: side === 'right' ? 1 : -1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(onDone);
  }, []);

  const rotateInterpolation = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-45deg', '0deg', '45deg'],
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: x,
          top: y,
          width,
          height: GAME.BLOCK_HEIGHT,
          backgroundColor: color,
          opacity,
          transform: [
            { translateY },
            { rotate: rotateInterpolation },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    borderRadius: 3,
    zIndex: 20,
  },
});
