import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../src/components/Button';
import { AppLogoHeader } from '../../../src/components/AppLogoHeader';
import {
  ONBOARDING_SKIP_TUTORIAL_LABEL,
  ONBOARDING_WELCOME_STEPS,
  ONBOARDING_WELCOME_SUBTITLE,
  ONBOARDING_WELCOME_TAGLINE,
} from '../../../src/constants/onboarding';
import { useFinishOnboarding } from '../../../src/hooks/useFinishOnboarding';
import { colors, layout, spacing } from '../../../src/constants/theme';

export default function OnboardingWelcomeScreen() {
  const { finish, finishing } = useFinishOnboarding();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <AppLogoHeader tagline={ONBOARDING_WELCOME_TAGLINE} iconSize={88} />
        <Text style={styles.subtitle}>{ONBOARDING_WELCOME_SUBTITLE}</Text>

        <View style={styles.steps}>
          {ONBOARDING_WELCOME_STEPS.map((label, index) => (
            <Step key={label} number={String(index + 1)} label={label} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Get Started"
          size="lg"
          onPress={() => router.push('/(app)/onboarding/group' as Href)}
          disabled={finishing}
        />
        <Button
          title={ONBOARDING_SKIP_TUTORIAL_LABEL}
          variant="ghost"
          onPress={() => finish()}
          loading={finishing}
          style={styles.skip}
        />
      </View>
    </SafeAreaView>
  );
}

function Step({ number, label }: { number: string; label: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  steps: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  stepLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  skip: {
    marginTop: spacing.sm,
  },
});
