import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants';

export function TapToStart() {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.95,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.text, { opacity, transform: [{ scale }] }]}>
        TAP TO START
      </Animated.Text>
      <Animated.View style={[styles.hand, { opacity }]}>
        <Animated.Text style={[styles.handEmoji, { transform: [{ scale }] }]}>
          👆
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 6,
    marginBottom: 16,
  },
  hand: {
    marginTop: 4,
  },
  handEmoji: {
    fontSize: 36,
  },
});
