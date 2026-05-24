import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  OnboardingStepLayout,
} from '../../../src/components/onboarding/OnboardingStepLayout';
import {
  ONBOARDING_ITEM_TYPES,
  getOnboardingItemTypeColor,
  getOnboardingItemTypeLabel,
} from '../../../src/constants/onboarding';
import { colors, spacing, itemTypeConfig } from '../../../src/constants/theme';

export default function OnboardingItemTypesScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const goNext = () => {
    router.push(`/(app)/onboarding/calendar?groupId=${groupId}` as Href);
  };

  return (
    <OnboardingStepLayout
      step={3}
      title="Three ways to plan"
      subtitle="Lyvee organizes your household into tasks, events, and documents."
      onContinue={goNext}
      onSkip={goNext}
    >
      {ONBOARDING_ITEM_TYPES.map((item) => (
        <View key={item.type} style={styles.typeCard}>
          <View style={styles.typeHeader}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: `${getOnboardingItemTypeColor(item.type)}20` },
              ]}
            >
              <Text
                style={[
                  styles.typeIcon,
                  { color: getOnboardingItemTypeColor(item.type) },
                ]}
              >
                {itemTypeConfig[item.type].icon}
              </Text>
            </View>
            <Text style={styles.typeLabel}>{getOnboardingItemTypeLabel(item.type)}</Text>
          </View>
          <Text style={styles.typeDescription}>{item.description}</Text>
          <Text style={styles.typeExamples}>Examples: {item.examples}</Text>
        </View>
      ))}
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  typeLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  typeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  typeExamples: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
