import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  OnboardingBulletRow,
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import {
  ONBOARDING_FINISH_LABEL,
  ONBOARDING_REMINDER_FEATURES,
  ONBOARDING_REMINDERS_SUBTITLE,
  ONBOARDING_REMINDERS_TITLE,
  getOnboardingTourStepProps,
  normalizeOnboardingGroupId,
} from '../../../src/constants/onboarding';
import { useFinishOnboarding } from '../../../src/hooks/useFinishOnboarding';

export default function OnboardingRemindersScreen() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = normalizeOnboardingGroupId(params.groupId);
  const stepProps = getOnboardingTourStepProps(5);
  const { finish, finishing } = useFinishOnboarding();

  return (
    <OnboardingStepLayout
      {...stepProps}
      title={ONBOARDING_REMINDERS_TITLE}
      subtitle={ONBOARDING_REMINDERS_SUBTITLE}
      onContinue={() => finish(groupId)}
      continueLabel={ONBOARDING_FINISH_LABEL}
      preserveContinueTitle
      loading={finishing}
      tourSkip
      groupId={groupId}
    >
      {ONBOARDING_REMINDER_FEATURES.map((feature) => (
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
