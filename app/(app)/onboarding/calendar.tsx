import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  OnboardingFeatureRow,
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
  const stepProps = getOnboardingTourStepProps(2, groupId);

  const goNext = () => {
    router.push(buildOnboardingHref('/(app)/onboarding/sharing', groupId));
  };

  return (
    <OnboardingStepLayout
      {...stepProps}
      title={ONBOARDING_NAV_TITLE}
      subtitle={ONBOARDING_NAV_SUBTITLE}
      onContinue={goNext}
      tourSkip
      groupId={groupId}
    >
      {ONBOARDING_NAV_FEATURES.map((feature) => (
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
