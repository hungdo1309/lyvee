import React from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  OnboardingFeatureRow,
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import { ONBOARDING_CALENDAR_FEATURES } from '../../../src/constants/onboarding';

export default function OnboardingCalendarScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const goNext = () => {
    router.push(`/(app)/onboarding/sharing?groupId=${groupId}` as Href);
  };

  return (
    <OnboardingStepLayout
      step={4}
      title="Calendar & Items"
      subtitle="Switch views depending on how you like to browse your household plan."
      onContinue={goNext}
      onSkip={goNext}
    >
      {ONBOARDING_CALENDAR_FEATURES.map((feature) => (
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
