import { NativeModules } from 'react-native';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let cachedModule: GoogleSignInModule | null | undefined;

export function isGoogleSignInNativeAvailable(): boolean {
  return Boolean(NativeModules.RNGoogleSignin);
}

export function getGoogleSignInModule(): GoogleSignInModule | null {
  if (!isGoogleSignInNativeAvailable()) {
    return null;
  }

  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    // Only require after confirming the native module exists (e.g. EAS build).
    cachedModule =
      require('@react-native-google-signin/google-signin') as GoogleSignInModule;
    return cachedModule;
  } catch {
    cachedModule = null;
    return null;
  }
}

export const GOOGLE_SIGNIN_UNAVAILABLE_MESSAGE =
  'Google Sign-In requires a LyVee development or preview build. It is not available in Expo Go.';
