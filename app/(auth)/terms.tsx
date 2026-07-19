import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackButton } from '../../src/components/ScreenBackButton';
import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from '../../src/constants/legalTerms';
import { colors, layout, spacing, typography } from '../../src/constants/theme';

export default function TermsOfUseScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenBackButton label="Back" showChevron />
        <Text style={styles.screenTitle}>Terms of Use</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated: {TERMS_LAST_UPDATED}</Text>
        {TERMS_SECTIONS.map((section, index) => (
          <View key={section.heading ?? `intro-${index}`} style={styles.section}>
            {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
            <Text style={styles.paragraph}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    ...typography.heading,
    fontSize: 24,
    marginTop: spacing.xs,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  updated: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  heading: {
    ...typography.label,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
