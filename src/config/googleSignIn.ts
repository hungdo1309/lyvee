import {
  getGoogleSignInModule,
  isGoogleSignInNativeAvailable,
} from '../utils/googleSignInNative';

let configured = false;

export function isGoogleSignInConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}

export function isGoogleSignInAvailable(): boolean {
  return isGoogleSignInConfigured() && isGoogleSignInNativeAvailable();
}

export function configureGoogleSignIn(): void {
  if (configured || !isGoogleSignInAvailable()) return;

  const { GoogleSignin } = getGoogleSignInModule() ?? {};
  if (!GoogleSignin) return;

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}
