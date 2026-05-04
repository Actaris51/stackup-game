import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import { CustomizeScreen } from './src/screens/CustomizeScreen';
import { initializeAds } from './src/utils/ads';
import { authenticate as authenticateGameCenter } from './src/utils/gameCenter';
import {
  getActiveDifficulty,
  getActiveTheme,
  runV11MigrationIfNeeded,
  setActiveDifficulty as persistActiveDifficulty,
  setActiveTheme as persistActiveTheme,
} from './src/utils/storage';
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_THEME_ID,
  getDifficulty,
  getTheme,
  type DifficultyId,
  type ThemeId,
} from './src/constants';

type Screen = 'home' | 'game' | 'customize';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [activeThemeId, setActiveThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [activeDifficultyId, setActiveDifficultyIdState] =
    useState<DifficultyId>(DEFAULT_DIFFICULTY_ID);
  const [bootstrapped, setBootstrapped] = useState(false);

  // First-mount: migrate legacy data, load preferences, kick off ads + GC auth.
  useEffect(() => {
    (async () => {
      try {
        await runV11MigrationIfNeeded();
      } catch (e) {
        console.log('[App] v1.1 migration failed (non-fatal)', e);
      }
      try {
        const [themeId, difficultyId] = await Promise.all([
          getActiveTheme(),
          getActiveDifficulty(),
        ]);
        setActiveThemeIdState(themeId);
        setActiveDifficultyIdState(difficultyId);
      } catch (e) {
        console.log('[App] failed to load preferences', e);
      }
      setBootstrapped(true);

      // Side effects — fire-and-forget, never block UX.
      initializeAds();
      authenticateGameCenter();
    })();
  }, []);

  const theme = getTheme(activeThemeId);
  const difficulty = getDifficulty(activeDifficultyId);

  const handleChangeTheme = useCallback(async (id: ThemeId) => {
    setActiveThemeIdState(id);
    try {
      await persistActiveTheme(id);
    } catch (e) {
      console.log('[App] failed to persist theme', e);
    }
  }, []);

  const handleChangeDifficulty = useCallback(async (id: DifficultyId) => {
    setActiveDifficultyIdState(id);
    try {
      await persistActiveDifficulty(id);
    } catch (e) {
      console.log('[App] failed to persist difficulty', e);
    }
  }, []);

  if (!bootstrapped) {
    // Brief blank-screen during migration; matches the splash bg so it's invisible.
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {screen === 'home' && (
        <HomeScreen
          theme={theme}
          difficulty={difficulty}
          onPlay={() => setScreen('game')}
          onCustomize={() => setScreen('customize')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          theme={theme}
          difficulty={difficulty}
          onHome={() => setScreen('home')}
        />
      )}
      {screen === 'customize' && (
        <CustomizeScreen
          theme={theme}
          difficulty={difficulty}
          onChangeTheme={handleChangeTheme}
          onChangeDifficulty={handleChangeDifficulty}
          onBack={() => setScreen('home')}
        />
      )}
    </>
  );
}
