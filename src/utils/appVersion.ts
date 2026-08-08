import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Numeric store build: Android versionCode / iOS CFBundleVersion. */
export function getNativeBuildNumber(): number {
  const raw = Constants.nativeBuildVersion;
  const n = raw != null ? Number.parseInt(String(raw), 10) : NaN;
  return Number.isFinite(n) ? n : 0;
}

/** Marketing version from the binary / app config (e.g. "1.0.0"). */
export function getAppVersion(): string {
  return (
    Constants.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    '0.0.0'
  );
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

  if (Platform.OS === 'android') {
    if (
      typeof minAndroidVersionCode === 'number' &&
      minAndroidVersionCode > 0 &&
      build < minAndroidVersionCode
    ) {
      return true;
    }
  }

  if (Platform.OS === 'ios') {
    if (
      typeof minIosBuildNumber === 'number' &&
      minIosBuildNumber > 0 &&
      build < minIosBuildNumber
    ) {
      return true;
    }
  }

  if (
    typeof minAppVersion === 'string' &&
    minAppVersion.trim().length > 0 &&
    compareSemver(version, minAppVersion.trim()) < 0
  ) {
    return true;
  }

  return false;
}
