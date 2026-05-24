import React from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  OnboardingFeatureRow,
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import { ONBOARDING_SHARING_FEATURES } from '../../../src/constants/onboarding';

export default function OnboardingSharingScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const goNext = () => {
    router.push(`/(app)/onboarding/reminders?groupId=${groupId}` as Href);
  };

  return (
    <OnboardingStepLayout
      step={5}
      title="Share & collaborate"
      subtitle="Keep the right people in the loop without oversharing."
      onContinue={goNext}
      onSkip={goNext}
    >
      {ONBOARDING_SHARING_FEATURES.map((feature) => (
        <OnboardingFeatureRow
          key={feature.title}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </OnboardingStepLayout>
  );
}
