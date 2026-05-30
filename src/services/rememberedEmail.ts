import * as SecureStore from 'expo-secure-store';

const REMEMBER_EMAIL_KEY = 'lyvee.rememberEmail';
const REMEMBER_EMAIL_ENABLED_KEY = 'lyvee.rememberEmailEnabled';

export async function loadRememberedEmail(): Promise<string | null> {
  const enabled = await SecureStore.getItemAsync(REMEMBER_EMAIL_ENABLED_KEY);
  if (enabled !== 'true') {
    return null;
  }

  return SecureStore.getItemAsync(REMEMBER_EMAIL_KEY);
}

export async function saveRememberedEmail(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) return;

  await SecureStore.setItemAsync(REMEMBER_EMAIL_KEY, trimmed);
  await SecureStore.setItemAsync(REMEMBER_EMAIL_ENABLED_KEY, 'true');
}

export async function clearRememberedEmail(): Promise<void> {
  await SecureStore.deleteItemAsync(REMEMBER_EMAIL_KEY);
  await SecureStore.setItemAsync(REMEMBER_EMAIL_ENABLED_KEY, 'false');
}

export async function persistRememberEmailPreference(
  email: string,
  remember: boolean
): Promise<void> {
  if (remember) {
    await saveRememberedEmail(email);
    return;
  }

  await clearRememberedEmail();
}
