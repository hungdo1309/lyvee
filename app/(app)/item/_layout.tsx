import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '../../../src/constants/theme';

export default function ItemLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
        ...(Platform.OS === 'android'
          ? { animation: 'slide_from_bottom' as const }
          : null),
      }}
    />
  );
}
