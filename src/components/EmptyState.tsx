import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { colors, radius, spacing, typography } from '../constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  compact?: boolean;
}

export function EmptyState({
  icon = '📋',
  title,
  subtitle,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <Text style={styles.action} onPress={action.onPress}>
          {action.label}
        </Text>
      ) : null}
    </View>
  );
}

/** Inline empty hint for lists and calendar day sections */
export function EmptyHint({ message }: { message: string }) {
  return (
    <Card variant="flat" padded style={styles.hintCard}>
      <Text style={styles.hintText}>{message}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  compact: {
    flex: 0,
    paddingVertical: spacing.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    ...typography.heading,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  hintCard: {
    marginBottom: 0,
    backgroundColor: colors.iconBg,
  },
  hintText: {
    ...typography.caption,
    textAlign: 'center',
  },
});
