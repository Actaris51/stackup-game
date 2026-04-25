import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import { getHighScore } from '../utils/storage';

interface HomeScreenProps {
  onPlay: () => void;
}

export function HomeScreen({ onPlay }: HomeScreenProps) {
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    getHighScore().then(setHighScore);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>STACK</Text>
        <Text style={styles.titleAccent}>UP</Text>
      </View>

      <Text style={styles.subtitle}>Tap to stack. Don't miss.</Text>

      <TouchableOpacity style={styles.playButton} onPress={onPlay} activeOpacity={0.8}>
        <Text style={styles.playText}>PLAY</Text>
      </TouchableOpacity>

      {highScore > 0 && (
        <View style={styles.highScoreContainer}>
          <Text style={styles.highScoreLabel}>BEST SCORE</Text>
          <Text style={styles.highScoreValue}>{highScore}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  title: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 8,
  },
  titleAccent: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 60,
    letterSpacing: 2,
  },
  playButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 60,
    paddingVertical: 20,
    borderRadius: 40,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  playText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.buttonText,
    letterSpacing: 6,
  },
  highScoreContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  highScoreLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 3,
  },
  highScoreValue: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 4,
  },
});
