import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/** True only on iOS when Sign in with Apple is available on this device. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export function generateAppleNonce(length = 32): string {
  const charset =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  const bytes = Crypto.getRandomBytes(length);
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += charset[bytes[i] % charset.length];
  }
  return value;
}

export type AppleSignInNonce = {
  raw: string;
  hashed: string;
};

const NONCE_POOL_TARGET = 4;
let noncePool: AppleSignInNonce[] = [];
let fillingNoncePool = false;

async function fillAppleSignInNoncePool(): Promise<void> {
  if (fillingNoncePool) return;
  fillingNoncePool = true;
  try {
    while (noncePool.length < NONCE_POOL_TARGET) {
      const raw = generateAppleNonce();
      const hashed = await hashAppleNonce(raw);
      noncePool.push({ raw, hashed });
    }
  } finally {
    fillingNoncePool = false;
  }
}

/** Warm nonces so Sign in with Apple can open from a button tap without an await first. */
export function prepareAppleSignInNonces(): void {
  void fillAppleSignInNoncePool();
}

/** Returns a pre-hashed nonce for immediate use in AppleAuthentication.signInAsync. */
export function takeAppleSignInNonce(): AppleSignInNonce | null {
  const nonce = noncePool.shift() ?? null;
  void fillAppleSignInNoncePool();
  return nonce;
}

export async function hashAppleNonce(rawNonce: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
}

export function formatAppleFullName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null | undefined
): string | null {
  if (!fullName) return null;
  const parts = [fullName.givenName, fullName.familyName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (parts.length === 0) return null;
  return parts.join(' ');
}
