// Web stub for ads.ts — Metro picks this file automatically for web builds.
//
// Why it exists: react-native-google-mobile-ads imports react-native internals
// (codegenNativeComponent) that hard-fail web bundling on Expo SDK 54+, even
// behind a runtime `if (isNative)` guard — Metro still follows the require at
// bundle time. Web is a dev/preview surface only (the shipped app is iOS), so
// every ad API becomes a benign no-op here. Keep the exported surface in sync
// with ads.ts.

export const AD_CONFIG = {
  INTERSTITIAL_ID: '__WEB__',
  REWARDED_ID: '__WEB__',
  BANNER_ID: '__WEB__',
  INTERSTITIAL_FREQUENCY: 3,
};

export async function requestATTPermissionIfNeeded(): Promise<void> {
  // iOS-only concept — nothing to do on web.
}

export async function initializeAds(): Promise<void> {
  console.log('[Ads] (web) initializeAds no-op');
}

export async function showInterstitial(): Promise<void> {
  console.log('[Ads] (web) interstitial skipped');
}

export async function showRewarded(): Promise<boolean> {
  console.log('[Ads] (web) rewarded skipped — simulating a watched ad');
  return true; // Simulate reward so unlock/continue flows are testable on web.
}
