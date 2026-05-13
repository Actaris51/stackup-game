import { AppState, Platform } from 'react-native';
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
    // 3=development, 4=adHoc, 5=appStore. Available since expo-application
    // 5.x. Be defensive: if the property is absent (older SDK or web), we
    // default to PROD ads — but only when we can also positively confirm
    // we're on a real iOS build (release channel populated, etc.).
    const appCompat = Application as unknown as {
      iosApplicationReleaseType?: number;
      applicationReleaseType?: number;
    };
    const type = appCompat.iosApplicationReleaseType ?? appCompat.applicationReleaseType;
    if (typeof type === 'number') {
      if (type !== 5) return true;
    } else {
      // Property genuinely missing — treat as suspicious and serve TEST ads
      // to avoid serving real ads to ourselves (TestFlight, simulator…).
      // The cost of misclassifying an App Store install as test is one user
      // who sees Google's filler ad for one session; the inverse risk is
      // an AdMob ban for invalid traffic. We pick the safer side.
      console.log('[Ads] iosApplicationReleaseType missing — defaulting to TEST ads');
      return true;
    }
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
let AdsConsent: any = null;

if (isNative) {
  try {
    const RNMA = require('react-native-google-mobile-ads');
    InterstitialAd = RNMA.InterstitialAd;
    RewardedAd = RNMA.RewardedAd;
    AdEventType = RNMA.AdEventType;
    RewardedAdEventType = RNMA.RewardedAdEventType;
    mobileAds = RNMA.default;
    MaxAdContentRating = RNMA.MaxAdContentRating;
    // UMP / Google Funding Choices — required for EU GDPR consent.
    AdsConsent = RNMA.AdsConsent;
  } catch {}
}

/**
 * Wait until the app is in `UIApplicationStateActive` before resolving.
 * Per Apple docs, ATT prompts are silently dropped if the app isn't active.
 * Returns immediately if already active; gives up after `timeoutMs` to avoid
 * blocking app startup forever in pathological cases.
 */
async function waitForActiveState(timeoutMs = 3000): Promise<void> {
  if (AppState.currentState === 'active') return;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      sub.remove();
      resolve();
    }, timeoutMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearTimeout(timeout);
        sub.remove();
        resolve();
      }
    });
  });
}

let attRequested = false;

/**
 * Request the App Tracking Transparency permission once, with proper
 * sequencing for iOS 26+. MUST be called BEFORE any other system UI
 * (Game Center auth, push permission, etc.) — Apple silently drops the
 * ATT prompt if another permission request or system banner is pending.
 *
 * History: v1.0.1 (build 13) was rejected by Apple Review under
 * Guideline 2.1 because reviewers couldn't see the ATT prompt on
 * iPadOS 26.4.2. Root cause: `initializeAds()` and `authenticateGameCenter()`
 * fired in parallel, and Game Center's native UI raced ahead of the ATT
 * request, blocking it per Apple's "another request pending" rule.
 *
 * This helper:
 *  - awaits `UIApplicationStateActive` before requesting,
 *  - is idempotent (safe to call multiple times),
 *  - logs every step so a future review rejection can be diagnosed.
 */
export async function requestATTPermissionIfNeeded(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (attRequested) return;
  attRequested = true;
  try {
    const current = await TrackingTransparency.getTrackingPermissionsAsync();
    console.log('[Ads] ATT current status:', current.status);
    if (current.status !== 'undetermined') {
      // Already granted/denied/restricted — system won't re-prompt.
      return;
    }
    await waitForActiveState();
    console.log('[Ads] ATT requesting permission, AppState=', AppState.currentState);
    const result = await TrackingTransparency.requestTrackingPermissionsAsync();
    console.log('[Ads] ATT request resolved:', result.status);
  } catch (e) {
    console.log('[Ads] ATT request failed', e);
  }
}

let initPromise: Promise<void> | null = null;

export async function initializeAds(): Promise<void> {
  if (!isNative || !mobileAds) {
    return;
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // ATT must already have been requested by the caller via
    // requestATTPermissionIfNeeded(). We don't request here to avoid
    // racing with other system UI (e.g. Game Center auth).

    // UMP consent flow (Google Funding Choices). Mandatory for EU users —
    // without it AdMob can only serve non-personalized ads (lower revenue).
    // Outside the EU `gatherConsent` is a no-op that returns canRequestAds=true.
    // Failure is non-fatal: SDK init proceeds with default (non-personalized) ads.
    if (AdsConsent) {
      try {
        if (typeof AdsConsent.gatherConsent === 'function') {
          const result = await AdsConsent.gatherConsent();
          console.log('[Ads] UMP gatherConsent', result);
        } else {
          // Fallback for older versions: request info + show form if required.
          const info = await AdsConsent.requestInfoUpdate();
          if (info?.isConsentFormAvailable) {
            await AdsConsent.loadAndShowConsentFormIfRequired?.();
          }
        }
      } catch (e) {
        console.log('[Ads] UMP consent flow failed (non-fatal)', e);
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

const AD_TIMEOUT_MS = 8000;

export async function showInterstitial(): Promise<void> {
  if (!isNative || !InterstitialAd) {
    console.log('[Ads] Interstitial skipped (web)');
    return;
  }
  await initializeAds();

  return new Promise((resolve) => {
    const ad = InterstitialAd.createForAdRequest(AD_CONFIG.INTERSTITIAL_ID);
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      unsubLoaded();
      unsubClosed();
      unsubError();
      clearTimeout(timer);
      resolve();
    };
    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      ad.show();
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, settle);
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, settle);
    // Hard timeout: if the SDK fires neither LOADED→CLOSED nor ERROR
    // (corner-case network failures we've seen in the wild), the player
    // would be stuck on Game Over forever waiting for the await to return.
    const timer = setTimeout(() => {
      console.log('[Ads] Interstitial timed out, unblocking player');
      settle();
    }, AD_TIMEOUT_MS);
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
    let settled = false;

    function cleanup() {
      if (settled) return;
      settled = true;
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
      clearTimeout(timer);
    }

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

    // Same timeout safety net as interstitials. Rewarded ads have stricter
    // expected response (the user wants a reward), so failing fast = OK.
    const timer = setTimeout(() => {
      console.log('[Ads] Rewarded timed out, denying reward');
      cleanup();
      resolve(false);
    }, AD_TIMEOUT_MS);

    ad.load();
  });
}
