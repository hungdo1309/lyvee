import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  OnboardingBulletRow,
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import {
  ONBOARDING_TRIPS_EXPENSES_FEATURES,
  ONBOARDING_TRIPS_EXPENSES_SUBTITLE,
  ONBOARDING_TRIPS_EXPENSES_TITLE,
  buildOnboardingHref,
  getOnboardingTourStepProps,
  normalizeOnboardingGroupId,
} from '../../../src/constants/onboarding';

export default function OnboardingTripsExpensesScreen() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = normalizeOnboardingGroupId(params.groupId);
  const stepProps = getOnboardingTourStepProps(4);

  return (
    <OnboardingStepLayout
      {...stepProps}
      title={ONBOARDING_TRIPS_EXPENSES_TITLE}
      subtitle={ONBOARDING_TRIPS_EXPENSES_SUBTITLE}
      onContinue={() =>
        router.push(buildOnboardingHref('/(app)/onboarding/reminders', groupId))
      }
      tourSkip
      groupId={groupId}
    >
      {ONBOARDING_TRIPS_EXPENSES_FEATURES.map((feature) => (
        <OnboardingBulletRow
          key={feature.title}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </OnboardingStepLayout>
  );
}
