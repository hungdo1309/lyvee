import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { LoadingScreen } from '../../src/components/LoadingScreen';

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
      <Stack.Screen name="group" />
      <Stack.Screen name="item" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="change-email" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
