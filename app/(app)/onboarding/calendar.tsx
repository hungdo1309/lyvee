import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  OnboardingBulletRow,
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import {
  ONBOARDING_NAV_FEATURES,
  ONBOARDING_NAV_SUBTITLE,
  ONBOARDING_NAV_TITLE,
  buildOnboardingHref,
  getOnboardingTourStepProps,
  normalizeOnboardingGroupId,
} from '../../../src/constants/onboarding';

export default function OnboardingCalendarScreen() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = normalizeOnboardingGroupId(params.groupId);
  const stepProps = getOnboardingTourStepProps(2);

  return (
    <OnboardingStepLayout
      {...stepProps}
      title={ONBOARDING_NAV_TITLE}
      subtitle={ONBOARDING_NAV_SUBTITLE}
      onContinue={() =>
        router.push(buildOnboardingHref('/(app)/onboarding/sharing', groupId))
      }
      tourSkip
      groupId={groupId}
    >
      {ONBOARDING_NAV_FEATURES.map((feature) => (
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
