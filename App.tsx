import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import { CustomizeScreen } from './src/screens/CustomizeScreen';
import { OnboardingOverlay } from './src/components/OnboardingOverlay';
import { initializeAds, requestATTPermissionIfNeeded } from './src/utils/ads';
import {
  authenticate as authenticateGameCenter,
  installGameCenterAppStateListener,
} from './src/utils/gameCenter';
import {
  getActiveDifficulty,
  getActiveTheme,
  isOnboardingSeen,
  markOnboardingSeen,
  runV11MigrationIfNeeded,
  setActiveDifficulty as persistActiveDifficulty,
  setActiveTheme as persistActiveTheme,
  tickDailyStreak,
} from './src/utils/storage';
import { initSounds } from './src/utils/sounds';
import { getDailyChallenge, type DailyChallenge } from './src/utils/dailyChallenge';
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  // Non-null while the current game screen is a Daily Challenge run.
  // Computed at launch time (not app start) so it can't go stale across
  // midnight while the app sits open.
  const [dailyRun, setDailyRun] = useState<DailyChallenge | null>(null);

  // First-mount: migrate legacy data, load preferences, kick off ads + GC auth.
  useEffect(() => {
    (async () => {
      try {
        await runV11MigrationIfNeeded();
      } catch (e) {
        console.log('[App] v1.1 migration failed (non-fatal)', e);
      }
      try {
        const [themeId, difficultyId, onboardingSeen, streak] = await Promise.all([
          getActiveTheme(),
          getActiveDifficulty(),
          isOnboardingSeen(),
          tickDailyStreak(),
        ]);
        setActiveThemeIdState(themeId);
        setActiveDifficultyIdState(difficultyId);
        setShowOnboarding(!onboardingSeen);
        setDailyStreak(streak);
      } catch (e) {
        console.log('[App] failed to load preferences', e);
      }

      // Preload sound effects so the first place-sound on a fresh app has
      // zero latency. Safe to call even if expo-audio is missing.
      try {
        initSounds();
      } catch (e) {
        console.log('[App] sounds init failed (non-fatal)', e);
      }

      setBootstrapped(true);

      // Sequencing matters per Apple Guideline 2.1 (rejection on v1.0.1 build 13):
      // The ATT prompt is silently dropped by iOS if any other system UI
      // (e.g. Game Center auth banner) is already pending. We MUST await
      // the ATT request to fully resolve before kicking off Game Center
      // auth or AdMob init. After ATT, the rest can run in parallel.
      await requestATTPermissionIfNeeded();
      initializeAds();
      authenticateGameCenter();
      // Re-auth when the user comes back from Settings (could've signed out).
      installGameCenterAppStateListener();
    })();
  }, []);

  const handleOnboardingDismiss = useCallback(async () => {
    setShowOnboarding(false);
    try {
      await markOnboardingSeen();
    } catch (e) {
      console.log('[App] failed to persist onboarding flag', e);
    }
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
          dailyStreak={dailyStreak}
          onPlay={() => {
            setDailyRun(null);
            setScreen('game');
          }}
          onPlayDaily={() => {
            setDailyRun(getDailyChallenge());
            setScreen('game');
          }}
          onCustomize={() => setScreen('customize')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          theme={theme}
          difficulty={dailyRun ? dailyRun.difficulty : difficulty}
          isDaily={dailyRun !== null}
          dailyLabel={dailyRun?.label}
          onHome={() => {
            setDailyRun(null);
            setScreen('home');
          }}
        />
      )}
      {screen === 'customize' && (
        <CustomizeScreen
          theme={theme}
          difficulty={difficulty}
          onChangeTheme={handleChangeTheme}
          onChangeDifficulty={handleChangeDifficulty}
          onBack={() => setScreen('home')}
          onPlay={() => {
            setDailyRun(null);
            setScreen('game');
          }}
        />
      )}
      {showOnboarding && (
        <OnboardingOverlay theme={theme} onDone={handleOnboardingDismiss} />
      )}
    </>
  );
}
