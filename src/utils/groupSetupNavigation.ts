import { router, type Href } from 'expo-router';

export type GroupSetupIntent = 'join' | 'create';

const GROUPS_PATH = '/(app)/(tabs)/groups' as Href;

let pendingIntent: GroupSetupIntent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function setGroupSetupIntent(intent: GroupSetupIntent) {
  pendingIntent = intent;
  notifyListeners();
}

export function peekGroupSetupIntent(): GroupSetupIntent | null {
  return pendingIntent;
}

export function clearGroupSetupIntent() {
  pendingIntent = null;
}

export function consumeGroupSetupIntent(): GroupSetupIntent | null {
  const intent = pendingIntent;
  pendingIntent = null;
  return intent;
}

export function subscribeGroupSetupIntent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function navigateToJoinGroup() {
  setGroupSetupIntent('join');
  router.navigate(GROUPS_PATH);
}

export function navigateToCreateGroup() {
  setGroupSetupIntent('create');
  router.navigate(GROUPS_PATH);
}
