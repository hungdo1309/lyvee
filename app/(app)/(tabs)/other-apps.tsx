import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainTabScreen } from '../../../src/components/MainTabScreen';
import { colors, layout, spacing, typography } from '../../../src/constants/theme';

export default function OtherAppsScreen() {
  return (
    <MainTabScreen title="My Other Apps">
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          <Text style={styles.comingSoon}>Coming soon-ish</Text>
          <Text style={styles.subtitle}>
            My other apps are still stuck in traffic. They swore they left early.
          </Text>
        </View>
      </SafeAreaView>
    </MainTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  comingSoon: {
    ...typography.heading,
    fontSize: 20,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
  },
});
