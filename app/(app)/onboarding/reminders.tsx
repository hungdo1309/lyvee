import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  OnboardingFeatureRow,
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import { Button } from '../../../src/components/Button';
import { ONBOARDING_REMINDER_FEATURES } from '../../../src/constants/onboarding';
import { ensureNotificationPermissions } from '../../../src/services/notifications';
import { useFinishOnboarding } from '../../../src/hooks/useFinishOnboarding';
import { colors, spacing } from '../../../src/constants/theme';

export default function OnboardingRemindersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { finish, finishing } = useFinishOnboarding();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);

  const handleEnableNotifications = async () => {
    const granted = await ensureNotificationPermissions();
    setNotificationsEnabled(granted);
  };

  const handleFinish = () => {
    if (groupId) finish(groupId);
  };

  return (
    <OnboardingStepLayout
      step={6}
      title="Reminders"
      subtitle="Never miss a due date or document expiration."
      onContinue={handleFinish}
      continueLabel="Start using Lyvee"
      loading={finishing}
      footerExtra={
        notificationsEnabled === true ? (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>Notifications enabled</Text>
          </View>
        ) : (
          <Button
            title="Enable notifications"
            variant="secondary"
            onPress={handleEnableNotifications}
            style={styles.enableButton}
          />
        )
      }
    >
      {ONBOARDING_REMINDER_FEATURES.map((feature) => (
        <OnboardingFeatureRow
          key={feature.title}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
        />
      ))}
      {notificationsEnabled === false ? (
        <Text style={styles.permissionHint}>
          You can turn on notifications later in your phone settings.
        </Text>
      ) : null}
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  enableButton: {
    marginBottom: spacing.sm,
  },
  statusBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  permissionHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
});
