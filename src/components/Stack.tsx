import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Block } from './Block';
import { GAME } from '../constants';
import type { StackedBlock } from '../hooks/useGameEngine';

interface StackProps {
  blocks: StackedBlock[];
}

export function Stack({ blocks }: StackProps) {
  const visibleBlocks = blocks.slice(-GAME.VISIBLE_STACK_COUNT);
  const startIndex = Math.max(0, blocks.length - GAME.VISIBLE_STACK_COUNT);

  return (
    <View style={styles.container}>
      {visibleBlocks.map((block, i) => {
        const fromTop =
          GAME.STACK_AREA_HEIGHT -
          (i + 1) * GAME.BLOCK_HEIGHT;
        return (
          <View key={startIndex + i} style={[styles.blockRow, { top: fromTop }]}>
            <Block x={block.x} width={block.width} color={block.color} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  blockRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: GAME.BLOCK_HEIGHT,
  },
});
