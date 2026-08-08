import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Firestore: config/appUpdate (single doc, one getDoc per cold start).
 *
 * Example (set in Firebase Console when you need to force an update):
 * {
 *   "minAndroidVersionCode": 18,
 *   "minIosBuildNumber": 5,
 *   "minAppVersion": "1.3.0",
 *   "message": "Please update LyVee to continue.",
 *   "iosAppStoreId": "6740123456"
 * }
 *
 * Leave fields unset / 0 to skip that check. Missing doc = no force update.
 */
export type AppUpdateConfig = {
  minAndroidVersionCode?: number;
  minIosBuildNumber?: number;
  minAppVersion?: string;
  message?: string;
  iosAppStoreId?: string;
};

const CONFIG_PATH = ['config', 'appUpdate'] as const;

export async function fetchAppUpdateConfig(): Promise<AppUpdateConfig | null> {
  try {
    const snap = await getDoc(doc(db, ...CONFIG_PATH));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      minAndroidVersionCode: toOptionalPositiveInt(data.minAndroidVersionCode),
      minIosBuildNumber: toOptionalPositiveInt(data.minIosBuildNumber),
      minAppVersion:
        typeof data.minAppVersion === 'string' ? data.minAppVersion : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
      iosAppStoreId:
        typeof data.iosAppStoreId === 'string' ? data.iosAppStoreId : undefined,
    };
  } catch {
    // Fail open: do not hard-block if config cannot be read (offline / rules).
    return null;
  }
}

function toOptionalPositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}
