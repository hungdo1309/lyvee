import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  OnboardingFeatureRow,
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import {
  ONBOARDING_FINISH_LABEL,
  ONBOARDING_REMINDER_FEATURES,
  ONBOARDING_REMINDERS_SUBTITLE,
  getOnboardingTourStepProps,
  normalizeOnboardingGroupId,
} from '../../../src/constants/onboarding';
import { useFinishOnboarding } from '../../../src/hooks/useFinishOnboarding';

export default function OnboardingRemindersScreen() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = normalizeOnboardingGroupId(params.groupId);
  const stepProps = getOnboardingTourStepProps(4, groupId);
  const { finish, finishing } = useFinishOnboarding();

  return (
    <OnboardingStepLayout
      {...stepProps}
      title="Reminders"
      subtitle={ONBOARDING_REMINDERS_SUBTITLE}
      onContinue={() => finish(groupId)}
      continueLabel={ONBOARDING_FINISH_LABEL}
      preserveContinueTitle
      loading={finishing}
      tourSkip
      groupId={groupId}
    >
      {ONBOARDING_REMINDER_FEATURES.map((feature) => (
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
