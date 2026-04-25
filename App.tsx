import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import { initializeAds } from './src/utils/ads';

type Screen = 'home' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    initializeAds();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      {screen === 'home' ? (
        <HomeScreen onPlay={() => setScreen('game')} />
      ) : (
        <GameScreen onHome={() => setScreen('home')} />
      )}
    </>
  );
}
