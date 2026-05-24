import AsyncStorage from '@react-native-async-storage/async-storage';

const activeGroupKey = (userId: string) => `@lyvee/session/activeGroup:${userId}`;
const onboardingKey = (userId: string) => `@lyvee/session/onboardingComplete:${userId}`;

export async function saveActiveGroupSession(
  userId: string,
  groupId: string
): Promise<void> {
  await AsyncStorage.setItem(activeGroupKey(userId), groupId);
}

export async function loadActiveGroupSession(
  userId: string
): Promise<string | null> {
  return AsyncStorage.getItem(activeGroupKey(userId));
}

export async function clearActiveGroupSession(userId: string): Promise<void> {
  await AsyncStorage.removeItem(activeGroupKey(userId));
}

export async function loadOnboardingComplete(userId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(onboardingKey(userId));
  return value === 'true';
}

export async function saveOnboardingComplete(userId: string): Promise<void> {
  await AsyncStorage.setItem(onboardingKey(userId), 'true');
}
