import { Platform } from 'react-native';

export const ANDROID_PACKAGE_ID = 'com.lyvee.app';

/** Play Store listing (works once the app is published / in testing). */
export function getPlayStoreUrl(): string {
  return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;
}

/** market:// first on Android; falls back to https in openStoreListing. */
export function getPlayStoreMarketUrl(): string {
  return `market://details?id=${ANDROID_PACKAGE_ID}`;
}

/**
 * App Store listing. Prefer Firestore `iosAppStoreId`, then
 * EXPO_PUBLIC_IOS_APP_STORE_ID. Numeric id only (e.g. "6740123456").
 */
export function getAppStoreUrl(iosAppStoreId?: string | null): string | null {
  const id =
    (iosAppStoreId?.trim() || process.env.EXPO_PUBLIC_IOS_APP_STORE_ID?.trim() || '') ||
    null;
  if (!id) return null;
  return `https://apps.apple.com/app/id${id}`;
}

export function getStoreListingUrl(iosAppStoreId?: string | null): string | null {
  if (Platform.OS === 'android') return getPlayStoreUrl();
  if (Platform.OS === 'ios') return getAppStoreUrl(iosAppStoreId);
  return getPlayStoreUrl();
}
