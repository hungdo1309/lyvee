import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  OnboardingFeatureRow,
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import {
  ONBOARDING_SHARING_FEATURES,
  ONBOARDING_SHARING_SUBTITLE,
  buildOnboardingHref,
  getOnboardingTourStepProps,
  normalizeOnboardingGroupId,
} from '../../../src/constants/onboarding';

export default function OnboardingSharingScreen() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = normalizeOnboardingGroupId(params.groupId);
  const stepProps = getOnboardingTourStepProps(3, groupId);

  const goNext = () => {
    router.push(buildOnboardingHref('/(app)/onboarding/reminders', groupId));
  };

  return (
    <OnboardingStepLayout
      {...stepProps}
      title="Share & collaborate"
      subtitle={ONBOARDING_SHARING_SUBTITLE}
      onContinue={goNext}
      tourSkip
      groupId={groupId}
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
