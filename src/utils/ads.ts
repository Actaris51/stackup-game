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

// Decide whether to use test ads. This MUST be async on iOS: expo-application
// exposes the release type ONLY via getIosApplicationReleaseTypeAsync() — there
// is NO synchronous `iosApplicationReleaseType` property. The previous code read
// a property that never existed, so `type` was ALWAYS undefined → it ALWAYS fell
// back to TEST ads, even on the live App Store build → zero ad revenue for every
// real user. Verified against node_modules/expo-application/build/Application.d.ts
// (June 2026): the only iOS release-type API is the async function.
//
// - __DEV__ (local dev, Expo Go): always test ads.
// - iOS: real ads ONLY when release type === APP_STORE (5). TestFlight, simulator,
//   enterprise and ad-hoc → test ads.
// - Android: no release-type API → real ads (test distribution uses the
//   internal-testing track with its own config).
const IOS_APP_STORE_RELEASE_TYPE = 5; // ApplicationReleaseType.APP_STORE

// Safe synchronous default until the async iOS check resolves: serve TEST ads so
// we never accidentally serve (and get AdMob-flagged for) real ads to ourselves
// before confirming this is a real App Store install. Android is known
// synchronously (no async API) so it takes its final value immediately.
let useTestAds = __DEV__ ? true : Platform.OS === 'ios';
let adModeResolved = __DEV__ || Platform.OS !== 'ios';

/**
 * Resolve the iOS test-vs-prod ad decision via the async release-type API.
 * Idempotent and cheap after the first call. Called at the top of
 * initializeAds(), which every showInterstitial()/showRewarded() awaits — so
 * the ad-unit IDs below are always read AFTER this resolves.
 */
async function resolveAdModeIfNeeded(): Promise<void> {
  if (adModeResolved) return;
  try {
    const type = await Application.getIosApplicationReleaseTypeAsync();
    useTestAds = type !== IOS_APP_STORE_RELEASE_TYPE;
    console.log(
      `[Ads] iOS release type=${type} → serving ${useTestAds ? 'TEST' : 'PROD'} ads`
    );
  } catch (e) {
    // Couldn't determine the release type — keep the safe default (test ads).
    useTestAds = true;
    console.log('[Ads] release-type lookup failed — defaulting to TEST ads', e);
  }
  adModeResolved = true;
}

function activeAdUnitIds() {
  return useTestAds ? TEST_AD_IDS : PROD_AD_IDS;
}

export const AD_CONFIG = {
  // Ad-unit IDs are resolved lazily AFTER the async release-type check (see
  // resolveAdModeIfNeeded), so these getters always reflect the final TEST/PROD
  // decision rather than the pre-resolution default.
  get INTERSTITIAL_ID() {
    return activeAdUnitIds().INTERSTITIAL;
  },
  get REWARDED_ID() {
    return activeAdUnitIds().REWARDED;
  },
  get BANNER_ID() {
    return activeAdUnitIds().BANNER;
  },
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
    // Resolve test-vs-prod ad mode FIRST (async iOS release-type lookup) so the
    // ad-unit IDs picked by showInterstitial/showRewarded below are correct.
    await resolveAdModeIfNeeded();

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
        console.log('[Ads] Rewarded EARNED_REWARD event fired');
      }
    );
    // CRITICAL FIX (June 2026): If ad closes normally (user watched it or skipped
    // naturally), treat as reward earned. EARNED_REWARD doesn't always fire with
    // test ads or some ad networks, so we can't gate the reward on that event alone.
    // Timeout + error are still hard denials — only CLOSED w/o error = reward.
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup();
      console.log('[Ads] Rewarded ad closed normally — granting reward');
      resolve(true); // Ad closed without timeout/error = user earned reward
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      cleanup();
      console.log('[Ads] Rewarded ad error — denying reward');
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
