// In-app purchases — "Remove Ads" (non-consumable, iOS).
//
// Wraps expo-iap (v4). The native module only exists in a real build, so it
// is require()d behind a try/catch like modules/game-center — every function
// degrades to a no-op in Expo Go. Web resolves to purchases.web.ts instead
// (Metro platform extension), because Metro follows require() calls at bundle
// time even behind runtime guards (same reason ads.web.ts exists).
//
// Design:
// - Buying removes INTERSTITIALS only. Rewarded ads stay available: they are
//   player-initiated value exchanges (Continue, theme unlock) — removing them
//   would make the purchase feel like a downgrade.
// - The entitlement is cached locally (storage.isAdsRemoved) and re-synced
//   silently from StoreKit at every app start, so reinstalls self-heal even
//   if the user never taps "Restaurer".
// - The product must exist in App Store Connect under EXACTLY this id:
export const REMOVE_ADS_SKU = 'com.stackup.game.remove_ads';

import { Platform } from 'react-native';
import { isAdsRemoved, setAdsRemoved } from './storage';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

let Iap: any = null;
if (isNative) {
  try {
    Iap = require('expo-iap');
  } catch {
    Iap = null;
  }
}

export function isPurchasesAvailable(): boolean {
  return Iap !== null;
}

// In-flight init cache — same pattern as initializeAds()/authenticate().
let initPromise: Promise<void> | null = null;
// Cached product after the first successful fetch (StoreKit round-trips are
// slow and HomeScreen remounts on every navigation).
let cachedProduct: { id: string; displayPrice: string } | null = null;

function grantRemoveAds(): Promise<void> {
  console.log('[IAP] Remove Ads granted');
  return setAdsRemoved(true);
}

/**
 * Connect to StoreKit, install purchase listeners, finish any pending
 * transaction, and silently re-sync the entitlement from the store.
 * Fire-and-forget from App.tsx — never blocks startup, never throws.
 */
export async function initPurchases(): Promise<void> {
  if (!Iap) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await Iap.initConnection();

      // Catches purchases completing out-of-band: interrupted flows,
      // Ask-to-Buy approvals, purchases finishing after a crash.
      Iap.purchaseUpdatedListener(async (purchase: any) => {
        try {
          if (purchase?.productId === REMOVE_ADS_SKU) {
            await grantRemoveAds();
            await Iap.finishTransaction({ purchase, isConsumable: false });
          }
        } catch (e) {
          console.log('[IAP] purchaseUpdatedListener failed', e);
        }
      });
      Iap.purchaseErrorListener((error: any) => {
        console.log('[IAP] purchase error', error?.code, error?.message);
      });

      // Silent entitlement re-sync (reads local StoreKit entitlements — no
      // sign-in prompt). Heals reinstalls without the manual Restore button.
      const alreadyOwned = await isAdsRemoved();
      if (!alreadyOwned) {
        const purchases = await Iap.getAvailablePurchases();
        if (
          Array.isArray(purchases) &&
          purchases.some((p: any) => p?.productId === REMOVE_ADS_SKU)
        ) {
          await grantRemoveAds();
        }
      }
      console.log('[IAP] initialized');
    } catch (e) {
      console.log('[IAP] init failed (non-fatal)', e);
    }
  })();

  return initPromise;
}

/**
 * Fetch the Remove Ads product (localized price included). Returns null when
 * IAP is unavailable OR the product isn't configured in App Store Connect
 * yet — callers hide the purchase UI in that case, so shipping this code
 * before the ASC product exists degrades gracefully.
 */
export async function getRemoveAdsProduct(): Promise<{
  id: string;
  displayPrice: string;
} | null> {
  if (!Iap) return null;
  if (cachedProduct) return cachedProduct;
  try {
    await initPurchases();
    const products = await Iap.fetchProducts({
      skus: [REMOVE_ADS_SKU],
      type: 'in-app',
    });
    const product = Array.isArray(products)
      ? products.find((p: any) => p?.id === REMOVE_ADS_SKU)
      : null;
    if (!product) return null;
    cachedProduct = { id: product.id, displayPrice: product.displayPrice };
    return cachedProduct;
  } catch (e) {
    console.log('[IAP] fetchProducts failed', e);
    return null;
  }
}

/**
 * Launch the purchase flow. Resolves true once the entitlement is granted.
 * User cancellation resolves false (it is not an error).
 */
export async function purchaseRemoveAds(): Promise<boolean> {
  if (!Iap) return false;
  try {
    await initPurchases();
    const result = await Iap.requestPurchase({
      request: { apple: { sku: REMOVE_ADS_SKU } },
      type: 'in-app',
    });
    const purchases = Array.isArray(result) ? result : result ? [result] : [];
    const purchase = purchases.find((p: any) => p?.productId === REMOVE_ADS_SKU);
    if (purchase) {
      await grantRemoveAds();
      // The listener may also finish this transaction — finishing twice is
      // harmless (the second call is a no-op on an already-finished one).
      try {
        await Iap.finishTransaction({ purchase, isConsumable: false });
      } catch {}
      return true;
    }
    // No purchase object → rely on the flag (listener may have granted it).
    return isAdsRemoved();
  } catch (e: any) {
    const code = String(e?.code ?? '');
    if (code.includes('user-cancelled') || code.includes('E_USER_CANCELLED')) {
      console.log('[IAP] purchase cancelled by user');
    } else {
      console.log('[IAP] purchase failed', e);
    }
    return isAdsRemoved();
  }
}

/**
 * Manual restore (Apple requires a visible Restore control). Returns true if
 * the entitlement is owned after the sync.
 */
export async function restoreRemoveAds(): Promise<boolean> {
  if (!Iap) return isAdsRemoved();
  try {
    await initPurchases();
    await Iap.restorePurchases();
    const purchases = await Iap.getAvailablePurchases();
    if (
      Array.isArray(purchases) &&
      purchases.some((p: any) => p?.productId === REMOVE_ADS_SKU)
    ) {
      await grantRemoveAds();
      return true;
    }
    return isAdsRemoved();
  } catch (e) {
    console.log('[IAP] restore failed', e);
    return isAdsRemoved();
  }
}
