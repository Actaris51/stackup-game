// JS-side proxy for the local Expo native module wrapping Apple Game Center.
//
// On iOS, requireNativeModule resolves to the Swift implementation in
// ios/StackUpGameCenterModule.swift. On any other platform this throws on
// import — guarded by callers (see src/utils/gameCenter.ts).

import { requireNativeModule } from 'expo-modules-core';

interface AuthResult {
  authenticated: boolean;
  playerId?: string;
  displayName?: string;
}

interface StackUpGameCenterModule {
  authenticate(): Promise<AuthResult>;
  submitScore(leaderboardId: string, score: number): Promise<void>;
  unlockAchievement(achievementId: string): Promise<void>;
  reportProgress(achievementId: string, percentComplete: number): Promise<void>;
  showLeaderboard(leaderboardId?: string): Promise<void>;
  showAchievements(): Promise<void>;
  showGameCenter(): Promise<void>;
}

const native = requireNativeModule<StackUpGameCenterModule>('StackUpGameCenterModule');

export default native;
