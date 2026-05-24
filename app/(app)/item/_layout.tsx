import { Stack } from 'expo-router';
import { HeaderCancelButton } from '../../../src/components/HeaderCancelButton';
import { colors } from '../../../src/constants/theme';

export default function ItemLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        presentation: 'modal',
        gestureEnabled: true,
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="create"
        options={{
          title: 'New Item',
          headerLeft: () => <HeaderCancelButton />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Edit Item',
          headerLeft: () => <HeaderCancelButton />,
        }}
      />
    </Stack>
  );
}
