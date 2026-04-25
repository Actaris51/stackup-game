import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as TrackingTransparency from 'expo-tracking-transparency';

// Google's official test ad unit IDs — always serve fake test ads.
// Used in TestFlight and non-App-Store builds so reviewers can verify
// the rewarded-ad continue flow actually works.
// https://developers.google.com/admob/ios/test-ads
// https://developers.google.com/admob/android/test-ads
const TEST_AD_IDS = {
  INTERSTITIAL: Platform.select({
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
    default: '__TEST__',
  }) as string,
  REWARDED: Platform.select({
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios: 'ca-app-pub-3940256099942544/1712485313',
    default: '__TEST__',
  }) as string,
  BANNER: Platform.select({
    android: 'ca-app-pub-3940256099942544/6300978111',
    ios: 'ca-app-pub-3940256099942544/2934735716',
    default: '__TEST__',
  }) as string,
};

const PROD_AD_IDS = {
  INTERSTITIAL: Platform.select({
    android: 'ca-app-pub-3632953088792968/7596965784',
    ios: 'ca-app-pub-3632953088792968/3521320524',
    default: '__TEST__',
  }) as string,
  REWARDED: Platform.select({
    android: 'ca-app-pub-3632953088792968/1087397759',
    ios: 'ca-app-pub-3632953088792968/3667600691',
    default: '__TEST__',
  }) as string,
  BANNER: Platform.select({
    android: 'ca-app-pub-3632953088792968/5751298007',
    ios: 'ca-app-pub-3632953088792968/7666555455',
    default: '__TEST__',
  }) as string,
};

// Decide at module load whether to use test ads.
// - In __DEV__ (local dev, Expo Go): always test ads.
// - On iOS, expo-application exposes the release type. TestFlight, simulator,
//   enterprise and ad-hoc all get test ads. Only `appStore` uses real ads.
// - On Android there's no equivalent release-type API, so we use real ads
//   (Android test distribution uses the internal-testing track instead).
function shouldUseTestAds(): boolean {
  if (__DEV__) return true;
  if (Platform.OS === 'ios') {
    // ApplicationReleaseType: 0=unknown, 1=simulator, 2=enterprise,
    // 3=development, 4=adHoc, 5=appStore
    const type = (Application as any).iosApplicationReleaseType;
    if (typeof type === 'number' && type !== 5) return true;
  }
  return false;
}

const USE_TEST_ADS = shouldUseTestAds();
const ACTIVE_IDS = USE_TEST_ADS ? TEST_AD_IDS : PROD_AD_IDS;

if (USE_TEST_ADS) {
  console.log('[Ads] Using Google TEST ad unit IDs (non-App-Store build)');
}

export const AD_CONFIG = {
  INTERSTITIAL_ID: ACTIVE_IDS.INTERSTITIAL,
  REWARDED_ID: ACTIVE_IDS.REWARDED,
  BANNER_ID: ACTIVE_IDS.BANNER,
  INTERSTITIAL_FREQUENCY: 3,
};

// On web, ads are not supported — use no-op functions
const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let mobileAds: any = null;
let MaxAdContentRating: any = null;

if (isNative) {
  try {
    const RNMA = require('react-native-google-mobile-ads');
    InterstitialAd = RNMA.InterstitialAd;
    RewardedAd = RNMA.RewardedAd;
    AdEventType = RNMA.AdEventType;
    RewardedAdEventType = RNMA.RewardedAdEventType;
    mobileAds = RNMA.default;
    MaxAdContentRating = RNMA.MaxAdContentRating;
  } catch {}
}

let initPromise: Promise<void> | null = null;

export async function initializeAds(): Promise<void> {
  if (!isNative || !mobileAds) {
    return;
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // iOS: ask for App Tracking Transparency before initializing the SDK so
    // AdMob knows whether it can serve personalized ads.
    if (Platform.OS === 'ios') {
      try {
        const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
        if (status === 'undetermined') {
          await TrackingTransparency.requestTrackingPermissionsAsync();
        }
      } catch (e) {
        console.log('[Ads] ATT request failed', e);
      }
    }

    try {
      await mobileAds()
        .setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating?.G,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });
      const adapters = await mobileAds().initialize();
      console.log('[Ads] Mobile Ads SDK initialized', adapters?.length ?? 0, 'adapters');
    } catch (e) {
      console.log('[Ads] Mobile Ads SDK initialization failed', e);
    }
  })();

  return initPromise;
}

export async function showInterstitial(): Promise<void> {
  if (!isNative || !InterstitialAd) {
    console.log('[Ads] Interstitial skipped (web)');
    return;
  }
  await initializeAds();

  return new Promise((resolve) => {
    const ad = InterstitialAd.createForAdRequest(AD_CONFIG.INTERSTITIAL_ID);
    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      ad.show();
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
      resolve();
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
      resolve();
    });
    ad.load();
  });
}

export async function showRewarded(): Promise<boolean> {
  if (!isNative || !RewardedAd) {
    console.log('[Ads] Rewarded skipped (web)');
    return true; // Simulate reward on web for testing
  }
  await initializeAds();

  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(AD_CONFIG.REWARDED_ID);
    let rewarded = false;

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      ad.show();
    });
    const unsubEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        rewarded = true;
      }
    );
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup();
      resolve(rewarded);
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      cleanup();
      resolve(false);
    });

    function cleanup() {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
    }

    ad.load();
  });
}
