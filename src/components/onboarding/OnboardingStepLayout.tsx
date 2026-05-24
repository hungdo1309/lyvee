import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackButton } from '../ScreenBackButton';
import { Button } from '../Button';
import { colors, layout, spacing, typography } from '../../constants/theme';
import { ONBOARDING_TOTAL_STEPS } from '../../constants/onboarding';

interface OnboardingStepLayoutProps {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  onSkip?: () => void;
  skipLabel?: string;
  loading?: boolean;
  showBack?: boolean;
  footerExtra?: ReactNode;
}

export function OnboardingStepLayout({
  step,
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = 'Continue',
  onSkip,
  skipLabel = 'Skip for now',
  loading = false,
  showBack = true,
  footerExtra,
}: OnboardingStepLayoutProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {showBack ? (
        <View style={styles.backRow}>
          <ScreenBackButton />
        </View>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.step}>
          Step {step} of {ONBOARDING_TOTAL_STEPS}
        </Text>
        <View style={styles.progressRow}>
          {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, index) => (
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View style={styles.footer}>
        {footerExtra}
        <Button title={continueLabel} size="lg" onPress={onContinue} loading={loading} />
        {onSkip ? (
          <Button
            title={skipLabel}
            variant="ghost"
            onPress={onSkip}
            disabled={loading}
            style={styles.skip}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

interface OnboardingFeatureRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}

export function OnboardingFeatureRow({
  icon,
  title,
  description,
}: OnboardingFeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
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
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
