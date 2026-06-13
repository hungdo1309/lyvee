import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '../../../src/constants/theme';

export default function TripLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="[id]" options={{ presentation: 'card' }} />
      <Stack.Screen
        name="create"
        options={{
          presentation: 'modal',
          ...(Platform.OS === 'android'
            ? { animation: 'slide_from_bottom' as const }
            : null),
        }}
      />
    </Stack>
  );
}
