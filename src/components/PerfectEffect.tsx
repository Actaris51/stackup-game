import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants';

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
}

interface PerfectEffectProps {
  x: number;
  y: number;
  width: number;
  streak: number;
  onDone: () => void;
}

const PARTICLE_COLORS = ['#FFD700', '#FFA500', '#FF6347', '#FFFFFF', '#7FFFD4'];

export function PerfectEffect({ x, y, width, streak, onDone }: PerfectEffectProps) {
  const particles = useRef<Particle[]>(
    Array.from({ length: 8 + streak * 2 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0),
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }))
  ).current;

  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Flash
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 0.6,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Particles
    const anims = particles.map((p) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 80;
      return Animated.parallel([
        Animated.timing(p.x, {
          toValue: Math.cos(angle) * distance,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: Math.sin(angle) * distance - 20,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.scale, {
            toValue: 1.5,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(p.scale, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(anims).start(onDone);
  }, []);

  const centerX = x + width / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Flash overlay */}
      <Animated.View
        style={[
          styles.flash,
          {
            opacity: flashOpacity,
            backgroundColor: COLORS.perfect,
          },
        ]}
      />

      {/* Particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: centerX,
              top: y,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 31,
    marginLeft: -3,
    marginTop: -3,
  },
});
