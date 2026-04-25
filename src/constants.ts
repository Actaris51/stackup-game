import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const GAME = {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  BLOCK_HEIGHT: 25,
  INITIAL_BLOCK_WIDTH: SCREEN_WIDTH * 0.6,
  INITIAL_SPEED: 4,
  SPEED_INCREMENT: 0.15,
  MAX_SPEED: 12,
  PERFECT_TOLERANCE: 5,
  MIN_BLOCK_WIDTH: 10,
  VISIBLE_STACK_COUNT: 15,
  STACK_AREA_HEIGHT: SCREEN_HEIGHT * 0.75,
};

export const COLORS = {
  background: '#1a1a2e',
  backgroundGradientEnd: '#16213e',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  accent: '#e94560',
  perfect: '#FFD700',
  button: '#e94560',
  buttonText: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

const BLOCK_PALETTE = [
  '#FF6B6B', '#FF8E53', '#FFBD69', '#FFE66D',
  '#95E06C', '#4ECDC4', '#45B7D1', '#6C5CE7',
  '#A55EEA', '#FD79A8', '#FF6B6B', '#FF8E53',
];

export function getBlockColor(index: number): string {
  return BLOCK_PALETTE[index % BLOCK_PALETTE.length];
}
