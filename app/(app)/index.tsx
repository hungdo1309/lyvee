import { Redirect, type Href } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { LoadingScreen } from '../../src/components/LoadingScreen';

export default function AppIndex() {
  const { onboardingComplete, ready } = useApp();

  if (!ready) return <LoadingScreen />;

  if (!onboardingComplete) {
    return <Redirect href={'/(app)/onboarding' as Href} />;
  }

  return <Redirect href={'/(app)/(tabs)' as Href} />;
}
