import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  OnboardingBulletRow,
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import {
  ONBOARDING_SHARING_FEATURES,
  ONBOARDING_SHARING_SUBTITLE,
  ONBOARDING_SHARING_TITLE,
  buildOnboardingHref,
  getOnboardingTourStepProps,
  normalizeOnboardingGroupId,
} from '../../../src/constants/onboarding';

export default function OnboardingSharingScreen() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = normalizeOnboardingGroupId(params.groupId);
  const stepProps = getOnboardingTourStepProps(3);

  return (
    <OnboardingStepLayout
      {...stepProps}
      title={ONBOARDING_SHARING_TITLE}
      subtitle={ONBOARDING_SHARING_SUBTITLE}
      onContinue={() =>
        router.push(buildOnboardingHref('/(app)/onboarding/reminders', groupId))
      }
      tourSkip
      groupId={groupId}
    >
      {ONBOARDING_SHARING_FEATURES.map((feature) => (
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
