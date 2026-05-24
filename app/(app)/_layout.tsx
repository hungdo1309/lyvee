import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { colors } from '../../src/constants/theme';

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="select-group" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="item" />
      <Stack.Screen
        name="feedback"
        options={{
          headerShown: true,
          title: 'Send Feedback',
          headerBackTitle: 'Settings',
          headerTintColor: colors.primary,
        }}
      />
    </Stack>
  );
}
