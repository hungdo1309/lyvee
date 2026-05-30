import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackButton } from '../ScreenBackButton';
import { Button } from '../Button';
import { colors, layout, spacing, typography } from '../../constants/theme';
import {
  ONBOARDING_TOUR_EXIT_LABEL,
  ONBOARDING_TOUR_STEPS,
} from '../../constants/onboarding';
import { useFinishOnboarding } from '../../hooks/useFinishOnboarding';

interface OnboardingProgressHeaderProps {
  step: number;
  title: string;
  subtitle: string;
  totalSteps?: number;
  stepLabel?: string;
}

export function OnboardingProgressHeader({
  step,
  title,
  subtitle,
  totalSteps,
  stepLabel,
}: OnboardingProgressHeaderProps) {
  const resolvedTotal = totalSteps ?? ONBOARDING_TOUR_STEPS;
  const label = stepLabel ?? `Step ${step} of ${resolvedTotal}`;

  return (
    <View style={styles.header}>
      <Text style={styles.step}>{label}</Text>
      <View style={styles.progressRow}>
        {Array.from({ length: resolvedTotal }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index < step && styles.progressDotComplete,
              index === step - 1 && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

interface OnboardingStepLayoutProps {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  groupId?: string;
  loading?: boolean;
  showBack?: boolean;
  tourSkip?: boolean;
  totalSteps?: number;
  stepLabel?: string;
  preserveContinueTitle?: boolean;
}

export function OnboardingStepLayout({
  step,
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = 'Continue',
  groupId,
  loading = false,
  showBack = true,
  tourSkip = false,
  totalSteps,
  stepLabel,
  preserveContinueTitle = false,
}: OnboardingStepLayoutProps) {
  const { finish, finishing } = useFinishOnboarding();
  const isBusy = loading || finishing;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {showBack ? (
        <View style={styles.backRow}>
          <ScreenBackButton showChevron />
        </View>
      ) : null}

      <OnboardingProgressHeader
        step={step}
        title={title}
        subtitle={subtitle}
        totalSteps={totalSteps}
        stepLabel={stepLabel}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={continueLabel}
          size="lg"
          onPress={onContinue}
          loading={isBusy}
          disabled={isBusy}
          preserveTitle={preserveContinueTitle}
        />
        {tourSkip ? (
          <Button
            title={ONBOARDING_TOUR_EXIT_LABEL}
            variant="ghost"
            onPress={() => finish(groupId)}
            disabled={isBusy}
            preserveTitle
            style={styles.skip}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

interface OnboardingBulletRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}

export function OnboardingBulletRow({
  icon,
  title,
  description,
}: OnboardingBulletRowProps) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletIconWrap}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.bulletCopy}>
        <Text style={styles.bulletTitle}>{title}</Text>
        <Text style={styles.bulletDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backRow: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
  },
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  step: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.sm / 2,
    marginBottom: spacing.md,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressDotComplete: {
    backgroundColor: colors.primaryLight,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  skip: {
    marginTop: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  bulletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletCopy: {
    flex: 1,
    gap: 4,
  },
  bulletTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  bulletDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
