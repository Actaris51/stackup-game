import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GAME } from '../constants';

interface BlockProps {
  x: number;
  width: number;
  color: string;
  isMoving?: boolean;
}

export function Block({ x, width, color, isMoving }: BlockProps) {
  return (
    <View
      style={[
        styles.block,
        {
          left: x,
          width,
          height: GAME.BLOCK_HEIGHT,
          backgroundColor: color,
          ...(isMoving && styles.moving),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  moving: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
