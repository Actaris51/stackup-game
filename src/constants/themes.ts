// Cosmetic themes — block palette + background + accent colors.
// Each theme has a stable id used as a storage key. Never rename ids.
//
// Default (Classic) reproduces the v1.0 look exactly so existing players
// see no visual change after upgrading until they explicitly switch theme.

export type ThemeId =
  | 'classic'
  | 'sunset'
  | 'ocean'
  | 'forest'
  | 'neon'
  | 'monochrome'
  | 'galaxy';

// Optional ambient background images (AI-generated, optimized to WebP by
// scripts/process-theme-backgrounds.py — total ~96 KB for all five).
// Classic + Monochrome stay flat on purpose: their minimal identity is the
// point. require() is static so Metro bundles these unconditionally.
const BG_SUNSET = require('../../assets/backgrounds/sunset.webp');
const BG_OCEAN = require('../../assets/backgrounds/ocean.webp');
const BG_FOREST = require('../../assets/backgrounds/forest.webp');
const BG_NEON = require('../../assets/backgrounds/neon.webp');
const BG_GALAXY = require('../../assets/backgrounds/galaxy.webp');

export interface Theme {
  id: ThemeId;
  /** French display name for the picker UI. */
  name: string;
  /** English display name (for future i18n). */
  nameEN: string;
  /** 12-color cycle used for stacked blocks. */
  blockPalette: string[];
  background: string;
  backgroundGradientEnd: string;
  /**
   * Optional ambient background image (require() asset ref). When set,
   * ThemedBackground renders it cover-scaled behind a dark scrim instead
   * of the flat `background` color. Undefined = flat color (Classic,
   * Monochrome).
   */
  backgroundImage?: number;
  /**
   * Opacity of the dark scrim over backgroundImage. Higher = darker =
   * better block contrast but less visible art. Sunset & Neon need a
   * heavier scrim because their lower third (where the tower stacks) is
   * bright. Default applied in ThemedBackground when omitted.
   */
  backgroundScrimOpacity?: number;
  text: string;
  textSecondary: string;
  /** Brand accent — buttons, perfect ring, score UI. */
  accent: string;
  /** Highlight color for perfect-placement burst. */
  perfect: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  classic: {
    id: 'classic',
    name: 'Classique',
    nameEN: 'Classic',
    blockPalette: [
      '#FF6B6B', '#FF8E53', '#FFBD69', '#FFE66D',
      '#95E06C', '#4ECDC4', '#45B7D1', '#6C5CE7',
      '#A55EEA', '#FD79A8', '#FF6B6B', '#FF8E53',
    ],
    background: '#1a1a2e',
    backgroundGradientEnd: '#16213e',
    text: '#ffffff',
    textSecondary: '#a0a0b0',
    accent: '#e94560',
    perfect: '#FFD700',
  },
  sunset: {
    id: 'sunset',
    name: 'Coucher de soleil',
    nameEN: 'Sunset',
    blockPalette: [
      '#FF4E50', '#FC913A', '#F9D423', '#FF7043',
      '#E91E63', '#FF5722', '#F06292', '#FFC107',
      '#D81B60', '#FF8A65', '#FF4E50', '#FC913A',
    ],
    background: '#2D1B4E',
    backgroundGradientEnd: '#0F0524',
    backgroundImage: BG_SUNSET,
    backgroundScrimOpacity: 0.62, // bright orange lower third
    text: '#FFF5E6',
    textSecondary: '#C8B5D9',
    accent: '#FF4E50',
    perfect: '#FFE066',
  },
  ocean: {
    id: 'ocean',
    name: 'Océan',
    nameEN: 'Ocean',
    blockPalette: [
      '#00B4D8', '#0096C7', '#48CAE4', '#90E0EF',
      '#0077B6', '#48CAE4', '#2EC4B6', '#A2D6F9',
      '#5BC0EB', '#0496FF', '#00B4D8', '#0096C7',
    ],
    background: '#001D3D',
    backgroundGradientEnd: '#000814',
    backgroundImage: BG_OCEAN,
    backgroundScrimOpacity: 0.42, // already very dark
    text: '#CAF0F8',
    textSecondary: '#A2D6F9',
    accent: '#48CAE4',
    perfect: '#FFD60A',
  },
  forest: {
    id: 'forest',
    name: 'Forêt',
    nameEN: 'Forest',
    blockPalette: [
      '#52B788', '#74C69D', '#95D5B2', '#B7E4C7',
      '#40916C', '#2D6A4F', '#A98467', '#D4A373',
      '#CCD5AE', '#E9EDC9', '#52B788', '#74C69D',
    ],
    background: '#1B2D1F',
    backgroundGradientEnd: '#081C15',
    backgroundImage: BG_FOREST,
    backgroundScrimOpacity: 0.45,
    text: '#F1F8F0',
    textSecondary: '#B7CFA9',
    accent: '#95D5B2',
    perfect: '#FCBF49',
  },
  neon: {
    id: 'neon',
    name: 'Néon',
    nameEN: 'Neon',
    blockPalette: [
      '#FF006E', '#FB5607', '#FFBE0B', '#8338EC',
      '#3A86FF', '#06FFA5', '#FF006E', '#FB5607',
      '#FFBE0B', '#8338EC', '#3A86FF', '#06FFA5',
    ],
    background: '#0A0014',
    backgroundGradientEnd: '#000000',
    backgroundImage: BG_NEON,
    backgroundScrimOpacity: 0.6, // bright neon grid at the bottom
    text: '#FFFFFF',
    textSecondary: '#B388EB',
    accent: '#FF006E',
    perfect: '#FFFF00',
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    nameEN: 'Monochrome',
    blockPalette: [
      '#FFFFFF', '#E0E0E0', '#BDBDBD', '#9E9E9E',
      '#757575', '#616161', '#9E9E9E', '#BDBDBD',
      '#FFFFFF', '#E0E0E0', '#BDBDBD', '#9E9E9E',
    ],
    background: '#0A0A0A',
    backgroundGradientEnd: '#000000',
    text: '#FFFFFF',
    textSecondary: '#9E9E9E',
    accent: '#FFFFFF',
    perfect: '#FFD700',
  },
  galaxy: {
    id: 'galaxy',
    name: 'Galaxie',
    nameEN: 'Galaxy',
    blockPalette: [
      '#7209B7', '#560BAD', '#480CA8', '#3A0CA3',
      '#3F37C9', '#4361EE', '#4895EF', '#4CC9F0',
      '#F72585', '#B5179E', '#7209B7', '#560BAD',
    ],
    background: '#10002B',
    backgroundGradientEnd: '#000000',
    backgroundImage: BG_GALAXY,
    backgroundScrimOpacity: 0.4, // dark nebula, keep it visible
    text: '#E0AAFF',
    textSecondary: '#9D4EDD',
    accent: '#F72585',
    perfect: '#FFD60A',
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'classic';

/** Gallery display order in the picker. */
export const THEME_ORDER: ThemeId[] = [
  'classic',
  'sunset',
  'ocean',
  'forest',
  'neon',
  'monochrome',
  'galaxy',
];

export function getTheme(id: ThemeId): Theme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}

export function getBlockColorFromTheme(theme: Theme, index: number): string {
  return theme.blockPalette[index % theme.blockPalette.length];
}
