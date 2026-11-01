import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Store build only: a positive integer string. "1.0.0" and missing values are unreadable. */
function parsePositiveBuild(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Android versionCode / iOS CFBundleVersion.
 * Null when the binary does not report one — callers must not treat that as outdated.
 */
export function getNativeBuildNumber(): number | null {
  return (
    parsePositiveBuild(Application.nativeBuildVersion) ??
    parsePositiveBuild(Constants.nativeBuildVersion)
  );
}

/** Marketing version from the binary (e.g. "1.0.2"). Null when it cannot be read. */
export function getAppVersion(): string | null {
  const version =
    Application.nativeApplicationVersion ||
    Constants.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    null;
  if (!version) return null;
  const trimmed = version.trim();
  if (!trimmed || trimmed === '0.0.0') return null;
  return trimmed;
}

/** Compare semver-ish strings: -1 if a < b, 0 if equal, 1 if a > b. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(/[.+-]/).map((p) => Number.parseInt(p, 10) || 0);
  const pb = b.split(/[.+-]/).map((p) => Number.parseInt(p, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

export type UpdateThresholds = {
  minAndroidVersionCode?: number | null;
  minIosBuildNumber?: number | null;
  minAppVersion?: string | null;
};

export function isBelowRequiredVersion(thresholds: UpdateThresholds): boolean {
  const { minAndroidVersionCode, minIosBuildNumber, minAppVersion } = thresholds;
  const build = getNativeBuildNumber();
  const version = getAppVersion();

  if (
    build != null &&
    Platform.OS === 'android' &&
    typeof minAndroidVersionCode === 'number' &&
    minAndroidVersionCode > 0 &&
    build < minAndroidVersionCode
  ) {
    return true;
  }

  if (
    build != null &&
    Platform.OS === 'ios' &&
    typeof minIosBuildNumber === 'number' &&
    minIosBuildNumber > 0 &&
    build < minIosBuildNumber
  ) {
    return true;
  }

  if (
    version != null &&
    typeof minAppVersion === 'string' &&
    minAppVersion.trim().length > 0 &&
    compareSemver(version, minAppVersion.trim()) < 0
  ) {
    return true;
  }

  return false;
}
