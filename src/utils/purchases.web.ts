// Web stub for purchases.ts — Metro picks this file for web builds.
// StoreKit doesn't exist on web; every call is a benign no-op. Keep the
// exported surface in sync with purchases.ts.

import { isAdsRemoved } from './storage';

export const REMOVE_ADS_SKU = 'com.stackup.game.remove_ads';

export function isPurchasesAvailable(): boolean {
  return false;
}

export async function initPurchases(): Promise<void> {
  console.log('[IAP] (web) initPurchases no-op');
}

export async function getRemoveAdsProduct(): Promise<{
  id: string;
  displayPrice: string;
} | null> {
  return null; // hides the purchase UI on web
}

export async function purchaseRemoveAds(): Promise<boolean> {
  return false;
}

export async function restoreRemoveAds(): Promise<boolean> {
  return isAdsRemoved();
}
