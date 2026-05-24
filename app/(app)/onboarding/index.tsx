import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../src/components/Button';
import { colors, layout, spacing, typography } from '../../../src/constants/theme';
import { ONBOARDING_WELCOME_STEPS } from '../../../src/constants/onboarding';

export default function OnboardingWelcomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.logo}>Lyvee</Text>
        <Text style={styles.title}>Shared life, simplified</Text>
        <Text style={styles.subtitle}>
          Organize tasks, activities, and documents with the people who matter.
        </Text>

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
  },
  logo: {
    ...typography.title,
    fontSize: 40,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  steps: {
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
});
