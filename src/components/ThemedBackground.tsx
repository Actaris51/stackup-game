// Renders a theme's ambient background: either the flat `background` color
// (Classic, Monochrome) or the theme's WebP art behind a dark scrim
// (Sunset, Ocean, Forest, Neon, Galaxy).
//
// The scrim is a SEPARATE absolutely-positioned sibling, not a wrapper —
// putting `opacity` on a parent would dim the children too. As a bare leaf
// View its `opacity` only affects itself, keeping the tower + UI at full
// strength on top of a dimmed photo.
//
// Used by HomeScreen and GameScreen. CustomizeScreen deliberately stays on
// the flat color: it previews OTHER themes' palettes, so an active-theme
// photo behind the cards would muddy the comparison.

import React, { ReactNode } from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { Theme } from '../constants';

interface ThemedBackgroundProps {
  theme: Theme;
  children?: ReactNode;
  /** Extra style for the root (e.g. flex:1 layout, or absoluteFill when
   *  used purely as a background layer behind absolutely-placed content). */
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_SCRIM_OPACITY = 0.5;

export function ThemedBackground({
  theme,
  children,
  style,
}: ThemedBackgroundProps) {
  if (!theme.backgroundImage) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.background }, style]}>
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      source={theme.backgroundImage}
      resizeMode="cover"
      style={[styles.fill, style]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.background,
            opacity: theme.backgroundScrimOpacity ?? DEFAULT_SCRIM_OPACITY,
          },
        ]}
      />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
