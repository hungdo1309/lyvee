import { LogBox } from 'react-native';

/** Suppress known dev-only noise that is not actionable in Expo Go / simulators. */
export function configureDevLogBox(): void {
  if (!__DEV__) return;

  LogBox.ignoreLogs([
    '[Reanimated] Reduced motion setting is enabled',
    'expo-notifications: Android Push notifications',
    '`expo-notifications` functionality is not fully supported in Expo Go',
  ]);
}
